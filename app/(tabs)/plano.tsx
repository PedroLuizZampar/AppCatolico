import { PlanoCalendarModal } from '@/components/PlanoCalendarModal';
import { useAlert } from '@/lib/context/AlertContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useSelectedDate } from '@/lib/context/DateContext';
import { getTodayMisteriosStartId } from '@/lib/rosario';
import {
  deleteLocalActivity,
  excludeLocalActivity,
  getLocalActivities,
  getLocalCompletions,
  getLocalExclusions,
  toggleLocalCompletion
} from '@/lib/sqlite/sqliteDatabase';
import { syncEngine } from '@/lib/sync/SyncEngine';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlanoIcon } from '../../lib/planoIcons';

const { width } = Dimensions.get('window');

interface Activity {
  id: string;
  titulo: string;
  categoria?: string | null;
  dia?: string | null;
  horario: string;
  lembrete_ativo: number;
  lembrete_minutos_antes: number;
  repetir: number;
  frequencia?: string | null;
  dias_semana?: string | null;
  cor: string;
  icone?: string | null;
  mensagem_lembrete?: string | null;
  terminar_tipo?: string | null;
  terminar_vezes?: number | null;
  terminar_data?: string | null;
}

interface Completion {
  id: string;
  activity_id: string;
  data: string;
}

export default function PlanoScreen() {
  const router = useRouter();
  const { user, apiUrl } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const { selectedDate, setSelectedDate } = useSelectedDate();
  const [showCalendar, setShowCalendar] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const prevMonthYearRef = useRef({ month: selectedDate.getMonth(), year: selectedDate.getFullYear() });

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Formata data para AAAA-MM-DD
  const formatDateToSql = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Carregar dados locais do usuário
  const loadData = async () => {
    if (!user) return;
    try {
      const activeActivities = await getLocalActivities(user.id);
      const activeCompletions = await getLocalCompletions(user.id);
      const activeExclusions = await getLocalExclusions(user.id);
      setActivities(activeActivities);
      setCompletions(activeCompletions);
      setExclusions(activeExclusions);
    } catch (err) {
      console.error('[PlanoScreen] Erro ao carregar dados SQLite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Recarregar ao focar na tela (usado após adicionar/editar atividade)
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 2000); // Poll local SQLite a cada 2s para reatividade simples
    return () => clearInterval(interval);
  }, [user]);

  // Forçar sincronização manual
  const handleSyncPress = async () => {
    setSyncing(true);
    try {
      await syncEngine.sync();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  // Obter abreviações dos dias da semana
  const getWeekdayLabel = (date: Date): string => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  };

  const getFormattedMonth = (date: Date) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const currentMonthYear = useMemo(() => {
    return getFormattedMonth(selectedDate);
  }, [selectedDate]);

  // Gerar dias do mês selecionado
  const carouselDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const scrollCarouselToDate = (date: Date, animated = true) => {
    const index = date.getDate() - 1;
    if (index >= 0 && index < carouselDays.length) {
      flatListRef.current?.scrollToIndex({
        index,
        animated,
        viewPosition: 0.5
      });
    }
  };

  // Centralizar o dia selecionado quando o componente carregar ou trocar de data
  useEffect(() => {
    if (flatListRef.current && carouselDays.length > 0) {
      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();
      const sameMonthYear = prevMonthYearRef.current.month === currentMonth && prevMonthYearRef.current.year === currentYear;
      
      prevMonthYearRef.current = { month: currentMonth, year: currentYear };

      setTimeout(() => {
        scrollCarouselToDate(selectedDate, sameMonthYear);
      }, 150);
    }
  }, [selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()]);

  const handleSelectDateFromModal = (date: Date) => {
    setShowCalendar(false);
    setSelectedDate(date);
  };

  const isActivityExcluded = (activityId: string, date: Date): boolean => {
    const dateStr = formatDateToSql(date);
    return exclusions.some(exc => exc.activity_id === activityId && exc.data === dateStr);
  };

  // Filtrar atividades para o dia selecionado
  const filteredActivities = useMemo(() => {
    const dateStr = formatDateToSql(selectedDate);
    const dayOfMonth = selectedDate.getDate();
    const jsWeekday = selectedDate.getDay(); // 0=Dom, 1=Seg...
    
    return activities.filter(act => {
      // Se está excluído neste dia específico, não exibe
      if (isActivityExcluded(act.id, selectedDate)) {
        return false;
      }

      // Se a atividade possui data de término específica, não exibe após ela
      if (act.terminar_tipo === 'data' && act.terminar_data) {
        if (dateStr > act.terminar_data) {
          return false;
        }
      }
      
      // Se a atividade termina após um número de vezes
      if (act.terminar_tipo === 'vezes' && act.terminar_vezes) {
        const count = completions.filter(c => c.activity_id === act.id).length;
        if (count >= act.terminar_vezes) {
          const completedToday = completions.some(c => c.activity_id === act.id && c.data === dateStr);
          if (!completedToday) {
            return false;
          }
        }
      }

      if (act.repetir === 0) {
        return act.dia === dateStr;
      }
      
      switch (act.frequencia) {
        case 'diario':
          return true;
        case 'mensal':
          const actDay = act.dia ? parseInt(act.dia.split('-')[2], 10) : 1;
          return actDay === dayOfMonth;
        case 'semanal':
          // Lógica de semanal simples (se dia específico não for configurado)
          if (!act.dias_semana) {
            const actDayOfWeek = act.dia ? new Date(act.dia).getDay() : 0;
            return actDayOfWeek === jsWeekday;
          }
          // Lógica de dias específicos da semana ("1,2,3")
          const targetStr = String(jsWeekday);
          return act.dias_semana.split(',').includes(targetStr);
        default:
          return false;
      }
    });
  }, [activities, selectedDate, exclusions]);

  // Verificar se uma atividade está concluída na data selecionada
  const isActivityCompleted = (activityId: string): boolean => {
    const dateStr = formatDateToSql(selectedDate);
    return completions.some(c => c.activity_id === activityId && c.data === dateStr);
  };

  // Alternar conclusão de atividade
  const handleToggleCompletion = async (activityId: string) => {
    if (!user) return;
    const dateStr = formatDateToSql(selectedDate);
    try {
      await toggleLocalCompletion(user.id, activityId, dateStr);
      await loadData();
      // Disparar sincronização silenciosa
      syncEngine.sync().catch(err => console.log('[Sync] falhou silenciosamente:', err));
    } catch (err) {
      console.error(err);
    }
  };

  const getRecurrenceText = (act: Activity) => {
    if (act.repetir === 0) return 'Uma vez';
    switch (act.frequencia) {
      case 'diario': return 'Diariamente';
      case 'semanal': return 'Semanalmente';
      case 'mensal': return 'Mensalmente';
      case 'anual': return 'Anualmente';
      default: return 'Recorrente';
    }
  };

  const handleActivityPress = (act: Activity) => {
    const titleLower = act.titulo.toLowerCase();
    if (titleLower.includes('liturgia')) {
      router.push('/liturgia');
    } else if (titleLower.includes('evangelho') || titleLower.includes('meditação')) {
      router.push('/meditacao-evangelho');
    } else if (titleLower.includes('curiosidade')) {
      router.push('/curiosidades');
    } else if (titleLower.includes('terço') || titleLower.includes('terço do dia')) {
      router.push(`/livro/misterios-terco/capitulo/${getTodayMisteriosStartId(selectedDate)}?fluxo=intro&tipo=terco` as any);
    } else if (titleLower.includes('rosário') || titleLower.includes('santo rosário')) {
      router.push('/livro/misterios-terco');
    }
  };

  const handleOpenOptions = (act: Activity) => {
    setSelectedActivity(act);
    setShowOptionsModal(true);
  };

  const handleEditActivity = (act: Activity) => {
    setShowOptionsModal(false);
    router.push(`/plano/cadastro?editId=${act.id}` as any);
  };

  const handleExcludeForDay = async (act: Activity) => {
    if (!user) return;
    setShowOptionsModal(false);
    try {
      const dateStr = formatDateToSql(selectedDate);
      await excludeLocalActivity(user.id, act.id, dateStr);
      await loadData();
      syncEngine.sync().catch(console.error);
    } catch (e) {
      console.error('[Plano] Erro ao excluir deste dia:', e);
    }
  };

  const handleDeleteForAllDays = async (act: Activity) => {
    if (!user) return;
    setShowOptionsModal(false);
    try {
      await deleteLocalActivity(user.id, act.id);
      await loadData();
      syncEngine.sync().catch(console.error);
    } catch (e) {
      console.error('[Plano] Erro ao excluir de todos os dias:', e);
    }
  };

  // Agrupar atividades por turno
  const turnos = useMemo(() => {
    const manha: Activity[] = [];
    const tarde: Activity[] = [];
    const noite: Activity[] = [];

    filteredActivities.forEach(act => {
      const hour = parseInt(act.horario.split(':')[0], 10);
      if (hour >= 5 && hour < 12) {
        manha.push(act);
      } else if (hour >= 12 && hour < 18) {
        tarde.push(act);
      } else {
        noite.push(act);
      }
    });

    return { manha, tarde, noite };
  }, [filteredActivities]);

  // Formatar horário para "07h00"
  const formatHourString = (horario: string): string => {
    const [h, m] = horario.split(':');
    return `${h}h${m}`;
  };

  const FeatherIconOrIonicon = ({ name, size, color, style }: any) => {
    const iconName = name === 'sunrise' ? 'sunny-outline' : name === 'sun' ? 'partly-sunny-outline' : 'moon-outline';
    return <Ionicons name={iconName} size={size} color={color} style={style} />;
  };



  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.infoText, { color: colors.text }]}>Você precisa estar logado para acessar seu plano.</Text>
        <Pressable 
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.loginButtonText}>Ir para o Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Carrossel de Dias */}
        <View style={styles.carouselSection}>
          <View style={styles.monthHeaderRow}>
            <Text style={[styles.monthHeaderLabel, { color: colors.text }]}>{currentMonthYear}</Text>
            <Pressable onPress={() => setShowCalendar(true)} style={styles.calendarIconHeader}>
              <Ionicons name="calendar" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          
          <FlatList
            ref={flatListRef}
            data={carouselDays}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.toISOString()}
            getItemLayout={(data, index) => ({ length: 68, offset: 68 * index, index })}
            contentContainerStyle={styles.carouselContainer}
            renderItem={({ item }) => {
              const isSelected = 
                item.getDate() === selectedDate.getDate() &&
                item.getMonth() === selectedDate.getMonth() &&
                item.getFullYear() === selectedDate.getFullYear();
              
              const isToday = 
                item.getDate() === new Date().getDate() &&
                item.getMonth() === new Date().getMonth() &&
                item.getFullYear() === new Date().getFullYear();

              return (
                <Pressable
                  onPress={() => setSelectedDate(item)}
                  style={[
                    styles.dayCard,
                    isSelected 
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : isToday
                        ? { backgroundColor: colors.surface, borderColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.border }
                  ]}
                >
                  <Text 
                    style={[
                      styles.dayOfWeekText, 
                      { 
                        color: isSelected 
                          ? '#FFFFFF' 
                          : isToday 
                            ? colors.primary 
                            : colors.textSecondary 
                      },
                      isToday && { fontWeight: 'bold' }
                    ]}
                  >
                    {getWeekdayLabel(item)}
                  </Text>
                  <Text 
                    style={[
                      styles.dayNumberText, 
                      { 
                        color: isSelected 
                          ? '#FFFFFF' 
                          : isToday 
                            ? colors.primary 
                            : colors.text 
                      },
                      isToday && { fontWeight: 'bold' }
                    ]}
                  >
                    {String(item.getDate()).padStart(2, '0')}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Turnos */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.turnosContainer}>
            {/* Turno: Manhã */}
            <View style={styles.turnoSection}>
              <View style={styles.turnoHeader}>
                <FeatherIconOrIonicon name="sunrise" size={18} color={colors.primary} style={styles.turnoIcon} />
                <Text style={[styles.turnoTitle, { color: colors.text }]}>Manhã</Text>
              </View>
              {renderTurnoActivities(turnos.manha, '08:00')}
            </View>

            {/* Turno: Tarde */}
            <View style={styles.turnoSection}>
              <View style={styles.turnoHeader}>
                <FeatherIconOrIonicon name="sun" size={18} color={colors.primary} style={styles.turnoIcon} />
                <Text style={[styles.turnoTitle, { color: colors.text }]}>Tarde</Text>
              </View>
              {renderTurnoActivities(turnos.tarde, '14:00')}
            </View>

            {/* Turno: Noite */}
            <View style={styles.turnoSection}>
              <View style={styles.turnoHeader}>
                <FeatherIconOrIonicon name="moon" size={18} color={colors.primary} style={styles.turnoIcon} />
                <Text style={[styles.turnoTitle, { color: colors.text }]}>Noite</Text>
              </View>
              {renderTurnoActivities(turnos.noite, '20:00')}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal de Calendário Mensal */}
      <PlanoCalendarModal
        visible={showCalendar}
        selectedDate={selectedDate}
        onClose={() => setShowCalendar(false)}
        onSelectDate={handleSelectDateFromModal}
      />

      {/* Modal de Opções da Atividade */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.bsOverlay}>
          <Pressable style={styles.bsBackdrop} onPress={() => setShowOptionsModal(false)} />
          <View style={[
            styles.bsContent, 
            { 
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 24)
            }
          ]}>
            <View style={[styles.bsHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.bsHeaderLeft}>
                {selectedActivity && (
                  <View style={[styles.bsActivityIconCircle, { backgroundColor: selectedActivity.cor }]}>
                    <PlanoIcon name={selectedActivity.icone || 'star'} size={16} color="#fff" />
                  </View>
                )}
                <Text style={[styles.bsTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                  {selectedActivity?.titulo || 'Opções da Atividade'}
                </Text>
              </View>
              <Pressable onPress={() => setShowOptionsModal(false)} style={styles.bsCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.bsList}>
              {selectedActivity && (
                <>
                  <Pressable
                    onPress={() => handleEditActivity(selectedActivity)}
                    style={[styles.bsRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.bsRowLeft}>
                      <Ionicons name="create-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
                      <Text style={[styles.bsRowText, { color: colors.text }]}>Editar atividade</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </Pressable>

                  <Pressable
                    onPress={() => handleExcludeForDay(selectedActivity)}
                    style={[styles.bsRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.bsRowLeft}>
                      <Ionicons name="today-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
                      <Text style={[styles.bsRowText, { color: colors.text }]}>Excluir deste dia</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDeleteForAllDays(selectedActivity)}
                    style={[styles.bsRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.bsRowLeft}>
                      <Ionicons name="trash-outline" size={20} color={colors.error || '#D32F2F'} style={{ marginRight: 12 }} />
                      <Text style={[styles.bsRowText, { color: colors.error || '#D32F2F', fontWeight: '500' }]}>Excluir de todos os dias</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </Pressable>
                </>
              )}
            </View>

            <Pressable 
              onPress={() => setShowOptionsModal(false)} 
              style={[styles.confirmButton, { backgroundColor: colors.border, marginTop: spacing.md }]}
            >
              <Text style={[styles.confirmButtonText, { color: colors.text }]}>Voltar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );

  // Renderizar a lista de atividades para um turno
  function renderTurnoActivities(list: Activity[], defaultHour: string) {
    return (
      <View style={styles.turnoBody}>
        {list.map((act) => {
          const completed = isActivityCompleted(act.id);
          return (
            <Animated.View key={act.id} entering={FadeInDown.duration(300)}>
              <Pressable
                onPress={() => handleActivityPress(act)}
                style={[
                  styles.activityCard,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                  }
                ]}
              >
                <View style={styles.activityRow}>
                  {/* Círculo com Ícone Colorido */}
                  <View style={[styles.activityIconCircle, { backgroundColor: act.cor }]}>
                    <PlanoIcon name={act.icone || 'star'} size={18} color="#fff" />
                  </View>
                  
                  <View style={styles.activityDetails}>
                    <Text 
                      style={[
                        styles.activityTitle, 
                        { color: colors.text },
                        completed && { textDecorationLine: 'line-through', color: colors.textMuted }
                      ]}
                      numberOfLines={1}
                    >
                      {act.titulo}
                    </Text>
                    <View style={styles.activityTimeRow}>
                      <View style={[styles.timeBadge, { backgroundColor: colors.border }]}>
                        <Text style={[styles.timeBadgeText, { color: colors.textSecondary }]}>
                          {formatHourString(act.horario)}
                        </Text>
                      </View>
                      <View style={[styles.recurrenceBadge, { backgroundColor: colors.border }]}>
                        <Text style={[styles.recurrenceBadgeText, { color: colors.textSecondary }]}>
                          {getRecurrenceText(act)}
                        </Text>
                      </View>
                      {act.lembrete_ativo === 1 && (
                        <Ionicons name="notifications-outline" size={14} color={colors.primary} />
                      )}
                    </View>
                  </View>

                  {/* Círculo de Conclusão */}
                  <Pressable 
                    onPress={() => handleToggleCompletion(act.id)} 
                    style={styles.checkCircleContainer}
                  >
                    <View 
                      style={[
                        styles.checkCircle,
                        { borderColor: colors.border },
                        completed && { backgroundColor: colors.success, borderColor: colors.success }
                      ]}
                    >
                      {completed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                  </Pressable>

                  {/* Botão de Opções */}
                  <Pressable 
                    onPress={() => handleOpenOptions(act)} 
                    style={styles.optionsButton}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Botão de Adicionar Atividade no Turno */}
        <Pressable
          onPress={() => router.push(`/plano/cadastro?time=${defaultHour}&date=${formatDateToSql(selectedDate)}` as any)}
          style={[
            styles.addActivityButton,
            { backgroundColor: colors.surface, borderColor: colors.border }
          ]}
        >
          <Ionicons name="add" size={18} color={colors.textSecondary} />
          <Text style={[styles.addActivityButtonText, { color: colors.textSecondary }]}>
            Adicionar atividade
          </Text>
        </Pressable>
      </View>
    );
  }
}

// Helper para exibir ícone correto (Feather/Ionicons) dependendo do nome
const FeatherIconOrIonicon: React.FC<{ name: string; size: number; color: string; style?: any }> = ({
  name,
  size,
  color,
  style
}) => {
  if (name === 'sunrise') {
    return <Ionicons name="sunny-outline" size={size} color={color} style={style} />;
  }
  if (name === 'sun') {
    return <Ionicons name="sunny" size={size} color={color} style={style} />;
  }
  return <Ionicons name="moon-outline" size={size} color={color} style={style} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  infoText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loginButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  avatarButton: {
    marginLeft: spacing.xs,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  carouselSection: {
    paddingVertical: spacing.md,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  monthHeaderLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendarIconHeader: {
    padding: spacing.xs,
  },
  carouselContainer: {
    paddingHorizontal: spacing.sm,
    gap: 8,
  },
  dayCard: {
    width: 60,
    height: 70,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  turnosContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  turnoSection: {
    gap: spacing.sm,
  },
  turnoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  turnoIcon: {
    marginRight: spacing.sm,
  },
  turnoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  turnoBody: {
    gap: spacing.sm,
  },
  activityCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  addActivityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  timeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  recurrenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recurrenceBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  checkCircleContainer: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  optionsButton: {
    padding: spacing.xs,
  },
  bsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bsContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  bsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  bsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  bsActivityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bsCloseButton: {
    padding: spacing.xs,
  },
  bsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bsList: {
    paddingHorizontal: spacing.md,
  },
  bsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  bsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bsRowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
