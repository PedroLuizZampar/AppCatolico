import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDb } from '../sqlite/sqliteDatabase';

export interface ScheduledActivity {
  id: string;
  titulo: string;
  dia?: string | null;
  horario: string; // 'HH:MM'
  lembrete_ativo: number; // 0 ou 1
  lembrete_minutos_antes: number;
  repetir: number; // 0 ou 1
  frequencia?: string | null; // 'diario', 'semanal', 'mensal', 'especifico'
  dias_semana?: string | null; // Ex: '1,2,3' (0=Domingo, 1=Segunda, etc.)
  mensagem_lembrete?: string | null;
  cor?: string | null;
  icone?: string | null;
}

export class NotificationService {
  /**
   * Solicita permissão para exibir notificações locais
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      console.log(`[NotificationService] Permissão de notificação: ${finalStatus}`);
      return finalStatus === 'granted';
    } catch (error) {
      console.error('[NotificationService] Erro ao obter permissões de notificação:', error);
      return false;
    }
  }

  /**
   * Reagenda todas as notificações de um usuário baseado em suas atividades ativas no SQLite
   */
  static async rescheduleAll(userId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      // 1. Limpar todas as notificações locais agendadas anteriormente
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[NotificationService] Todas as notificações locais anteriores foram canceladas.');

      // 2. Solicitar permissões de notificação de forma silenciosa
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('[NotificationService] Sem permissões de notificação. Cancelando agendamentos.');
        return;
      }

      // 3. Buscar as atividades ativas do SQLite
      const db = await getDb();
      const rows = await db.getAllAsync<ScheduledActivity>(
        `SELECT id, titulo, dia, horario, lembrete_ativo, lembrete_minutos_antes, repetir, frequencia, dias_semana, mensagem_lembrete, cor, icone
         FROM local_activities 
         WHERE user_id = ? AND lembrete_ativo = 1 AND is_deleted = 0`,
        [userId]
      );

      console.log(`[NotificationService] Agendando notificações para ${rows.length} atividades ativas.`);

      for (const activity of rows) {
        await this.scheduleActivityNotifications(activity);
      }
      
      console.log('[NotificationService] Reagendamento de notificações concluído com sucesso!');
    } catch (error) {
      console.error('[NotificationService] Erro durante o reagendamento de notificações:', error);
    }
  }

  /**
   * Agenda os gatilhos de notificação para uma atividade específica
   */
  private static async scheduleActivityNotifications(activity: ScheduledActivity): Promise<void> {
    const [hourStr, minuteStr] = activity.horario.split(':');
    const targetHour = parseInt(hourStr, 10);
    const targetMinute = parseInt(minuteStr, 10);

    if (isNaN(targetHour) || isNaN(targetMinute)) {
      console.warn(`[NotificationService] Horário inválido para atividade ${activity.id}: ${activity.horario}`);
      return;
    }

    // Calcular horário de notificação ajustado pelo tempo de antecedência
    let notifyHour = targetHour;
    let notifyMinute = targetMinute - activity.lembrete_minutos_antes;

    if (notifyMinute < 0) {
      const hoursSubtract = Math.ceil(Math.abs(notifyMinute) / 60);
      notifyHour = (notifyHour - hoursSubtract + 24) % 24;
      notifyMinute = (notifyMinute + hoursSubtract * 60) % 60;
    }

    const title = activity.titulo;
    const body = activity.mensagem_lembrete || `Está na hora de: ${activity.titulo}!`;
    const notifColor = activity.cor || undefined;
    const notifData = { icone: activity.icone || null, cor: activity.cor || null };
    const notifContent = { title, body, color: notifColor, data: notifData };

    // Se repetir estiver desligado (uma única vez)
    if (activity.repetir === 0) {
      if (!activity.dia) return;
      const [year, month, day] = activity.dia.split('-').map(Number);
      // Criar a data da notificação
      const notifyDate = new Date(year, month - 1, day, notifyHour, notifyMinute, 0);
      
      // Só agenda se a data estiver no futuro
      if (notifyDate.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: notifContent,
          trigger: {
            type: 'date',
            date: notifyDate,
          } as any,
        });
        console.log(`[NotificationService] Agendado uma vez para: ${notifyDate.toString()}`);
      }
      return;
    }

    // Se for atividade com repetição
    switch (activity.frequencia) {
      case 'diario':
        await Notifications.scheduleNotificationAsync({
          content: notifContent,
          trigger: {
            type: 'daily',
            hour: notifyHour,
            minute: notifyMinute,
          } as any,
        });
        console.log(`[NotificationService] Agendado diário para ${notifyHour}h${notifyMinute.toString().padStart(2, '0')}`);
        break;

      case 'mensal':
        // Agendar para o dia específico do mês. Se for única vez/start date, pega o dia correspondente.
        const dayOfMonth = activity.dia ? parseInt(activity.dia.split('-')[2], 10) : 1;
        await Notifications.scheduleNotificationAsync({
          content: notifContent,
          trigger: {
            type: 'monthly',
            day: dayOfMonth,
            hour: notifyHour,
            minute: notifyMinute,
          } as any,
        });
        console.log(`[NotificationService] Agendado mensal para dia ${dayOfMonth} às ${notifyHour}h${notifyMinute.toString().padStart(2, '0')}`);
        break;

      case 'semanal':
        // Agendar para o dia da semana específico (usando a data de início se não tiver dias_semana)
        let weekday = 1; // Domingo padrão
        if (activity.dia) {
          const [yr, mn, dy] = activity.dia.split('-').map(Number);
          const startDate = new Date(yr, mn - 1, dy);
          // Em JS: 0=Domingo, 1=Segunda. Em Expo: 1=Domingo, 2=Segunda.
          weekday = startDate.getDay() + 1;
        }
        await Notifications.scheduleNotificationAsync({
          content: notifContent,
          trigger: {
            type: 'weekly',
            weekday,
            hour: notifyHour,
            minute: notifyMinute,
          } as any,
        });
        console.log(`[NotificationService] Agendado semanal para dia da semana ${weekday} às ${notifyHour}h${notifyMinute.toString().padStart(2, '0')}`);
        break;

      case 'especifico':
        // Agendar para múltiplos dias específicos da semana
        if (!activity.dias_semana) return;
        const days = activity.dias_semana.split(',').map(Number); // Array de dias (0=Dom, 1=Seg...)
        for (const day of days) {
          // Ajusta de 0-6 JS para 1-7 Expo (0=Dom -> 1, 1=Seg -> 2)
          const expoWeekday = day + 1;
          await Notifications.scheduleNotificationAsync({
            content: notifContent,
            trigger: {
              type: 'weekly',
              weekday: expoWeekday,
              hour: notifyHour,
              minute: notifyMinute,
            } as any,
          });
          console.log(`[NotificationService] Agendado dia da semana específico ${expoWeekday} às ${notifyHour}h${notifyMinute.toString().padStart(2, '0')}`);
        }
        break;

      default:
        break;
    }
  }
}
