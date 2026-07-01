import { PlanoCalendarModal } from '@/components/PlanoCalendarModal';
import { useAlert } from '@/lib/context/AlertContext';
import { useAuth } from '@/lib/context/AuthContext';
import { getLocalActivities, saveLocalActivity } from '@/lib/sqlite/sqliteDatabase';
import { syncEngine } from '@/lib/sync/SyncEngine';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing } from '@/lib/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlanoIcon } from '../../lib/planoIcons';

const { width } = Dimensions.get('window');

interface PresetItem {
  id: string;
  title: string;
  msg: string;
  color: string;
  icon: string;
  library: 'Ionicons' | 'MaterialCommunityIcons';
}

const PRESETS: PresetItem[] = [
  { id: 'liturgia',    title: 'Liturgia Diária',          msg: 'Hora da Liturgia Diária! Alimente sua alma com as leituras de hoje.',                    color: '#4CAF50', icon: 'calendar', library: 'Ionicons' },
  { id: 'evangelho',   title: 'Meditação do Evangelho',   msg: 'Que tal meditar o Evangelho agora? Abra o Sanctus para fazer sua leitura meditada.',   color: '#894e93', icon: 'book-open-variant', library: 'MaterialCommunityIcons' },
  { id: 'curiosidade', title: 'Curiosidade Diária',       msg: 'Sua curiosidade católica do dia já está disponível. Venha conferir!',                   color: '#FF9800', icon: 'lightbulb-on', library: 'MaterialCommunityIcons' },
  { id: 'terco',       title: 'Terço do Dia',             msg: 'Hora de rezar o Terço. Dedique este momento a Nossa Senhora.',                          color: '#c6a656', icon: 'hands-pray', library: 'MaterialCommunityIcons' },
  { id: 'rosario',     title: 'Santo Rosário',            msg: 'Momento de oração com o Santo Rosário. Una-se à Igreja na oração.',                     color: '#D32F2F', icon: 'rose', library: 'Ionicons' },
];

const COLORS = [
  '#4CAF50', // Verde
  '#894e93', // Roxo
  '#FF9800', // Laranja
  '#c6a656', // Dourado
  '#D32F2F', // Vermelho
  '#2196F3', // Azul
  '#9C27B0', // Violeta
  '#00BCD4', // Ciano
  '#607D8B'  // Cinza azulado
];

// Ícones sólidos disponíveis para tarefas customizadas (sem outline)
const ICONS: string[] = [
  'book', 'heart', 'star', 'flame', 'rose', 'bulb', 'calendar',
  'sunny', 'moon', 'water-outline', 'musical-notes', 'school',
  'fitness', 'bicycle', 'cafe', 'home', 'people', 'person',
  'trophy', 'ribbon', 'medal', 'flag', 'leaf', 'earth',
  'cloud', 'thunderstorm', 'snow', 'time', 'alarm', 'notifications',
  'mic', 'radio', 'camera', 'image', 'pencil', 'create',
];

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, title, children }) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.bsOverlay}>
        <Pressable style={styles.bsBackdrop} onPress={onClose} />
        <View style={[
          styles.bsContent, 
          { 
            backgroundColor: colors.surface,
            paddingBottom: Math.max(insets.bottom, 24)
          }
        ]}>
          <View style={[styles.bsHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.bsTitle, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={onClose} style={styles.bsCloseButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
};

export default function CadastroScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  
  const params = useLocalSearchParams();

  // Modais de Bottom Sheet
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [showMinutesPicker, setShowMinutesPicker] = useState(false);

  // Estados principais do cadastro
  const [isCustom, setIsCustom] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetItem | null>(null);
  const [showPresetSelector, setShowPresetSelector] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  
  // Data Inicial ("Hoje" por padrão)
  const [startDateStr, setStartDateStr] = useState(params.date as string || formatDateToSql(new Date()));
  const [hours, setHours] = useState(params.time ? parseInt((params.time as string).split(':')[0], 10) : 8);
  const [minutes, setMinutes] = useState(params.time ? parseInt((params.time as string).split(':')[1], 10) : 0);

  // Lembretes
  const [lembreteAtivo, setLembreteAtivo] = useState(true);
  const [lembreteMinutosAntes, setLembreteMinutosAntes] = useState(0); // 0 = na hora
  const [mensagemLembrete, setMensagemLembrete] = useState('');

  // Repetição
  const [repetir, setRepetir] = useState(true);
  const [frequencia, setFrequencia] = useState<'diario' | 'semanal' | 'mensal' | 'especifico'>('diario');
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]); // Segunda a Sexta por padrão

  // Término de repetição
  const [terminarTipo, setTerminarTipo] = useState<'nunca' | 'vezes' | 'data'>('nunca');
  const [terminarVezes, setTerminarVezes] = useState('10');
  const [terminarData, setTerminarData] = useState(formatDateToSql(new Date()));

  // Cores e ícone
  const [cor, setCor] = useState(COLORS[0]);
  const [icone, setIcone] = useState<string>('star');

  // Seletor de Presets
  const [search, setSearch] = useState('');

  // Formata data para Sql (AAAA-MM-DD)
  function formatDateToSql(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Carregar dados se editId for fornecido (modo edição)
  useEffect(() => {
    if (params.editId && user) {
      const loadActivityToEdit = async () => {
        try {
          const list = await getLocalActivities(user.id);
          const act = list.find(a => a.id === params.editId);
          if (act) {
            setIsCustom(true); 
            setCustomTitle(act.titulo);
            setCor(act.cor);
            setStartDateStr(act.dia || formatDateToSql(new Date()));
            const [h, m] = act.horario.split(':').map(Number);
            setHours(h);
            setMinutes(m);
            setLembreteAtivo(act.lembrete_ativo === 1);
            setLembreteMinutosAntes(act.lembrete_minutos_antes);
            setMensagemLembrete(act.mensagem_lembrete || '');
            setRepetir(act.repetir === 1);
            setFrequencia(act.frequencia || 'diario');
            if (act.dias_semana) {
              setDiasSemana(act.dias_semana.split(',').map(Number));
            }
            setTerminarTipo(act.terminar_tipo || 'nunca');
            setTerminarVezes(String(act.terminar_vezes || 10));
            setTerminarData(act.terminar_data || formatDateToSql(new Date()));
            if (act.icone) setIcone(act.icone);
            
            const preset = PRESETS.find(p => p.title.toLowerCase() === act.titulo.toLowerCase());
            if (preset) {
              setSelectedPreset(preset);
              setIcone(preset.icon);
              setIsCustom(false);
            }
            setShowPresetSelector(false);
          }
        } catch (e) {
          console.error('[Cadastro] Erro ao carregar atividade para edição:', e);
        }
      };
      loadActivityToEdit();
    }
  }, [params.editId, user]);

  // Filtragem de Presets por título
  const filteredPresets = useMemo(() => {
    return PRESETS.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const handleSelectPreset = (preset: PresetItem) => {
    setSelectedPreset(preset);
    setCor(preset.color);
    setIcone(preset.icon);
    setMensagemLembrete(preset.msg);
    setShowPresetSelector(false);
  };

  const toggleWeekday = (day: number) => {
    if (diasSemana.includes(day)) {
      setDiasSemana(diasSemana.filter(d => d !== day));
    } else {
      setDiasSemana([...diasSemana, day].sort());
    }
  };

  // Salvar a atividade
  const handleSave = async () => {
    if (!user) return;

    let title = '';

    if (isCustom) {
      title = customTitle.trim();
    } else {
      if (!selectedPreset) {
        showAlert({ title: 'Aviso', message: 'Selecione uma atividade para prosseguir.' });
        return;
      }
      title = selectedPreset.title;
    }

    if (!title) {
      showAlert({ title: 'Erro', message: 'Por favor, digite o nome da atividade.' });
      return;
    }

    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    // Preservar o ID caso seja edição, ou gerar novo
    const id = (params.editId as string) || (selectedPreset ? `preset_${user.id}_${selectedPreset.id}_${Date.now()}` : `custom_${user.id}_${Date.now()}`);

    const activityData = {
      id,
      titulo: title,
      dia: repetir ? null : startDateStr,
      horario: timeStr,
      lembrete_ativo: lembreteAtivo ? 1 : 0,
      lembrete_minutos_antes: lembreteMinutosAntes,
      repetir: repetir ? 1 : 0,
      frequencia: repetir ? frequencia : null,
      dias_semana: repetir && frequencia === 'semanal' ? diasSemana.join(',') : null,
      cor,
      icone,
      mensagem_lembrete: lembreteAtivo ? (mensagemLembrete.trim() || `Hora de realizar: ${title}`) : null,
      terminar_tipo: repetir ? terminarTipo : 'nunca',
      terminar_vezes: repetir && terminarTipo === 'vezes' ? parseInt(terminarVezes, 10) || 10 : 0,
      terminar_data: repetir && terminarTipo === 'data' ? terminarData : null
    };

    try {
      await saveLocalActivity(user.id, activityData);
      syncEngine.sync().catch(err => console.log('[Sync] falhou silenciosamente:', err));
      router.back();
    } catch (err) {
      console.error(err);
      showAlert({ title: 'Erro', message: 'Não foi possível salvar a atividade.' });
    }
  };

  const weekdaysLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Formatar rótulo para o dia da semana
  const getSelectedDateLabel = () => {
    const todaySql = formatDateToSql(new Date());
    if (startDateStr === todaySql) return 'Hoje';
    const [y, m, d] = startDateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const getFormattedEndDateLabel = () => {
    const [y, m, d] = terminarData.split('-');
    return `${d}/${m}/${y}`;
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'diario': return 'Diariamente';
      case 'semanal': return 'Semanalmente';
      case 'mensal': return 'Mensalmente';
      default: return 'Uma vez';
    }
  };

  const getEndTypeLabel = (type: string) => {
    switch (type) {
      case 'vezes': return 'Após um número de vezes';
      case 'data': return 'Em data específica';
      default: return 'Nunca';
    }
  };

  const getMinutesLabel = (min: number) => {
    switch (min) {
      case 0: return 'Na hora';
      case 5: return '5 min antes';
      case 10: return '10 min antes';
      case 15: return '15 min antes';
      case 30: return '30 min antes';
      default: return `${min} min antes`;
    }
  };

  // Spinner Customizado para roleta de horário (Confirmar / Voltar)
  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesArray = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  
  const [tempHour, setTempHour] = useState(hours);
  const [tempMin, setTempMin] = useState(minutes);

  const handleConfirmTime = () => {
    setHours(tempHour);
    setMinutes(tempMin);
    setShowTimePicker(false);
  };



  if (!isCustom && showPresetSelector) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Pesquisar"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Lista de Presets */}
        <FlatList
          data={filteredPresets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.presetsList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectPreset(item)}
              style={[styles.presetRow, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.presetIconCircle, { backgroundColor: item.color }]}>
                <PlanoIcon name={item.icon} size={18} color="#fff" />
              </View>
              <View style={styles.presetTextContainer}>
                <Text style={[styles.presetTitleText, { color: colors.text }]}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
          ListFooterComponent={
            <Pressable
              onPress={() => {
                setIsCustom(true);
                setCor(COLORS[0]);
                setMensagemLembrete('');
              }}
              style={styles.createCustomRow}
            >
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Criar personalizada</Text>
            </Pressable>
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        
        {/* Campo de Atividade */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Atividade</Text>
          
          {isCustom ? (
            <View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="O que irá fazer?"
                placeholderTextColor={colors.textMuted}
                value={customTitle}
                onChangeText={setCustomTitle}
                multiline={true}
              />
              <Pressable onPress={() => setIsCustom(false)} style={styles.toggleLink}>
                <Text style={{ color: colors.primary, fontWeight: '500' }}>Voltar para Presets</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.selectedPresetBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={[styles.presetIconCircle, { backgroundColor: cor, marginRight: 12 }]}>
                    <PlanoIcon name={icone || 'star'} size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedPresetTitle, { color: colors.text }]}>{selectedPreset?.title}</Text>
                </View>
                <Pressable onPress={() => setShowPresetSelector(true)}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Alterar</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => {
                setIsCustom(true);
                setCustomTitle(selectedPreset?.title || '');
              }} style={styles.toggleLinkInline}>
                <Text style={{ color: colors.primary, fontWeight: '500' }}>Criar personalizada</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Bloco de Agendamento/Quando */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Quando</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            
            {/* Dia (se não repetir) */}
            {!repetir && (
              <Pressable onPress={() => setShowCalendar(true)} style={[styles.selectRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>Dia</Text>
                <View style={styles.selectValueContainer}>
                  <Text style={[styles.selectValueText, { color: colors.textSecondary }]}>
                    {getSelectedDateLabel()}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </View>
              </Pressable>
            )}

            {/* Horário */}
            <Pressable onPress={() => {
              setTempHour(hours);
              setTempMin(minutes);
              setShowTimePicker(true);
            }} style={styles.selectRow}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Horário</Text>
              <View style={styles.selectValueContainer}>
                <Text style={[styles.selectValueText, { color: colors.textSecondary }]}>
                  {`${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Repetição */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Periodicidade</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            
            <View style={[styles.rowItem, { marginBottom: repetir ? spacing.md : 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>Repetir</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Ativar para repetir esta atividade</Text>
              </View>
              <Switch
                value={repetir}
                onValueChange={setRepetir}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {repetir && (
              <View style={{ gap: spacing.md }}>
                {/* Frequência */}
                <Pressable onPress={() => setShowFreqPicker(true)} style={[styles.selectRow, { borderBottomColor: colors.border, paddingBottom: spacing.sm }]}>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>Frequência</Text>
                  <View style={styles.selectValueContainer}>
                    <Text style={[styles.selectValueText, { color: colors.textSecondary }]}>
                      {getFrequencyLabel(frequencia)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </View>
                </Pressable>

                {/* Dias da semana (Semanal) */}
                {frequencia === 'semanal' && (
                  <View style={styles.weekdaysRow}>
                    <Text style={[styles.itemLabel, { color: colors.text, marginBottom: 8 }]}>Dias da semana</Text>
                    <View style={styles.weekdaysContainer}>
                      {weekdaysLabels.map((label, idx) => {
                        const active = diasSemana.includes(idx);
                        return (
                          <Pressable
                            key={idx}
                            onPress={() => toggleWeekday(idx)}
                            style={[
                              styles.weekdayCircle,
                              active 
                                ? { backgroundColor: colors.primary }
                                : { backgroundColor: colors.surface, borderColor: colors.border }
                            ]}
                          >
                            <Text style={[styles.weekdayText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Término */}
                <Pressable onPress={() => setShowEndPicker(true)} style={[styles.selectRow, { borderBottomColor: colors.border, paddingBottom: spacing.sm }]}>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>Terminar atividade</Text>
                  <View style={styles.selectValueContainer}>
                    <Text style={[styles.selectValueText, { color: colors.textSecondary }]}>
                      {getEndTypeLabel(terminarTipo)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </View>
                </Pressable>

                {/* Terminar após X vezes */}
                {terminarTipo === 'vezes' && (
                  <View style={[styles.rowItem, { paddingVertical: spacing.xs }]}>
                    <Text style={[styles.itemLabel, { color: colors.text }]}>Número de vezes</Text>
                    <TextInput
                      style={[styles.smallInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      keyboardType="number-pad"
                      value={terminarVezes}
                      onChangeText={setTerminarVezes}
                      placeholder="10"
                    />
                  </View>
                )}

                {/* Terminar em data específica */}
                {terminarTipo === 'data' && (
                  <Pressable onPress={() => setShowEndCalendar(true)} style={styles.selectRow}>
                    <Text style={[styles.itemLabel, { color: colors.text }]}>Data limite</Text>
                    <View style={styles.selectValueContainer}>
                      <Text style={[styles.selectValueText, { color: colors.textSecondary }]}>
                        {getFormattedEndDateLabel()}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </View>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Lembretes / Notificações */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Lembretes</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.rowItem, { marginBottom: lembreteAtivo ? spacing.md : 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>Habilitar lembrete</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Receber alertas locais de notificação</Text>
              </View>
              <Switch
                value={lembreteAtivo}
                onValueChange={setLembreteAtivo}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {lembreteAtivo && (
              <View style={{ gap: spacing.md }}>
                <Pressable onPress={() => setShowMinutesPicker(true)} style={[styles.selectRow, { borderBottomColor: colors.border, paddingBottom: spacing.xs }]}>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>Antecedência</Text>
                  <View style={styles.selectValueContainer}>
                    <Text style={[styles.selectValueText, { color: colors.textSecondary }]}>
                      {getMinutesLabel(lembreteMinutosAntes)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </View>
                </Pressable>

                {/* Mensagem customizada */}
                <View>
                  <Text style={[styles.itemLabel, { color: colors.text, marginBottom: 6 }]}>Mensagem do lembrete</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 44, paddingVertical: spacing.xs }]}
                    placeholder="Escreva a mensagem da notificação"
                    placeholderTextColor={colors.textMuted}
                    value={mensagemLembrete}
                    onChangeText={setMensagemLembrete}
                    multiline={true}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Seletor de Ícone (apenas para customizadas) */}
        {isCustom && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Ícone</Text>
            <View style={styles.iconsGrid}>
              {ICONS.map(ic => {
                const selected = icone === ic;
                return (
                  <Pressable
                    key={ic}
                    onPress={() => setIcone(ic)}
                    style={[
                      styles.iconCircle,
                      { backgroundColor: selected ? cor : colors.surface, borderColor: selected ? cor : colors.border }
                    ]}
                  >
                    <Ionicons name={ic as any} size={22} color={selected ? '#fff' : colors.textSecondary} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Seletor de Cores */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Cor de organização</Text>
          <View style={styles.colorsGrid}>
            {COLORS.map(c => (
              <Pressable
                key={c}
                onPress={() => setCor(c)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  cor === c && { borderWidth: 3, borderColor: colors.text }
                ]}
              />
            ))}
          </View>
        </View>

        {/* Botão de Salvar */}
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: '#FFFFFF', opacity: pressed ? 0.9 : 1 }
          ]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Salvar</Text>
        </Pressable>

      </ScrollView>

      {/* MODAL: Time Picker Spinner */}
      <BottomSheet visible={showTimePicker} onClose={() => setShowTimePicker(false)} title="Selecione o horário">
        <View style={styles.timeWheelRow}>
          {/* Horas */}
          <View style={styles.wheelColumn}>
            <FlatList
              data={['', ...hoursArray, '']}
              keyExtractor={(item, idx) => `h-${idx}`}
              snapToInterval={40}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              initialScrollIndex={tempHour}
              getItemLayout={(data, index) => ({ length: 40, offset: 40 * index, index })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                if (index >= 0 && index < hoursArray.length) {
                  setTempHour(hoursArray[index]);
                }
              }}
              renderItem={({ item }) => (
                <View style={styles.wheelItem}>
                  <Text style={[
                    styles.wheelItemText,
                    { color: item === tempHour ? colors.text : colors.textMuted },
                    item === tempHour && { fontWeight: 'bold', fontSize: 20 }
                  ]}>
                    {item !== '' ? String(item).padStart(2, '0') : ''}
                  </Text>
                </View>
              )}
            />
          </View>

          {/* overlay de linhas do centro */}
          <View style={styles.wheelOverlay} pointerEvents="none">
            <View style={[styles.wheelLine, { backgroundColor: colors.border }]} />
            <View style={[styles.wheelLine, { backgroundColor: colors.border, marginTop: 40 }]} />
          </View>

          {/* Minutos */}
          <View style={styles.wheelColumn}>
            <FlatList
              data={['', ...minutesArray, '']}
              keyExtractor={(item, idx) => `m-${idx}`}
              snapToInterval={40}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              initialScrollIndex={tempMin}
              getItemLayout={(data, index) => ({ length: 40, offset: 40 * index, index })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.y / 40);
                if (index >= 0 && index < minutesArray.length) {
                  setTempMin(minutesArray[index]);
                }
              }}
              renderItem={({ item }) => (
                <View style={styles.wheelItem}>
                  <Text style={[
                    styles.wheelItemText,
                    { color: item === tempMin ? colors.text : colors.textMuted },
                    item === tempMin && { fontWeight: 'bold', fontSize: 20 }
                  ]}>
                    {item !== '' ? String(item).padStart(2, '0') : ''}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
        <Pressable onPress={handleConfirmTime} style={[styles.confirmButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.confirmButtonText}>Confirmar</Text>
        </Pressable>
      </BottomSheet>

      {/* MODAL: Frequência Picker */}
      <BottomSheet visible={showFreqPicker} onClose={() => setShowFreqPicker(false)} title="Selecione a recorrência">
        <View style={styles.bsList}>
          {[
            { label: 'Diariamente', val: 'diario' },
            { label: 'Semanalmente', val: 'semanal' },
            { label: 'Mensalmente', val: 'mensal' }
          ].map(opt => (
            <Pressable
              key={opt.val}
              onPress={() => {
                setFrequencia(opt.val as any);
                setShowFreqPicker(false);
              }}
              style={[styles.bsRow, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.bsRowText, { color: colors.text }]}>{opt.label}</Text>
              {frequencia === opt.val && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* MODAL: Terminar Picker */}
      <BottomSheet visible={showEndPicker} onClose={() => setShowEndPicker(false)} title="Terminar atividade">
        <View style={styles.bsList}>
          {[
            { label: 'Nunca', val: 'nunca' },
            { label: 'Após um número de vezes', val: 'vezes' },
            { label: 'Em data específica', val: 'data' }
          ].map(opt => (
            <Pressable
              key={opt.val}
              onPress={() => {
                setTerminarTipo(opt.val as any);
                setShowEndPicker(false);
              }}
              style={[styles.bsRow, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.bsRowText, { color: colors.text }]}>{opt.label}</Text>
              {terminarTipo === opt.val && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* MODAL: Antecedência Picker */}
      <BottomSheet visible={showMinutesPicker} onClose={() => setShowMinutesPicker(false)} title="Antecedência do lembrete">
        <View style={styles.bsList}>
          {[
            { label: 'Na hora', val: 0 },
            { label: '5 minutos antes', val: 5 },
            { label: '10 minutos antes', val: 10 },
            { label: '15 minutos antes', val: 15 },
            { label: '30 minutos antes', val: 30 }
          ].map(opt => (
            <Pressable
              key={opt.val}
              onPress={() => {
                setLembreteMinutosAntes(opt.val);
                setShowMinutesPicker(false);
              }}
              style={[styles.bsRow, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.bsRowText, { color: colors.text }]}>{opt.label}</Text>
              {lembreteMinutosAntes === opt.val && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* Calendário para Dia de Início */}
      <PlanoCalendarModal
        visible={showCalendar}
        selectedDate={new Date(startDateStr + 'T00:00:00')}
        onClose={() => setShowCalendar(false)}
        onSelectDate={(date) => {
          setStartDateStr(formatDateToSql(date));
          setShowCalendar(false);
        }}
      />

      {/* Calendário para Data de Término */}
      <PlanoCalendarModal
        visible={showEndCalendar}
        selectedDate={new Date(terminarData + 'T00:00:00')}
        onClose={() => setShowEndCalendar(false)}
        onSelectDate={(date) => {
          setTerminarData(formatDateToSql(date));
          setShowEndCalendar(false);
        }}
      />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  pickerHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: spacing.md,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  presetsList: {
    paddingHorizontal: spacing.md,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  presetColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  presetIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetTextContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  presetTitleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createCustomRow: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  formScroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  toggleLink: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    padding: spacing.xs,
  },
  toggleLinkInline: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  selectedPresetBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  selectedPresetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  smallInput: {
    width: 80,
    height: 38,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  selectValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectValueText: {
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownContainer: {
    flex: 1,
    marginLeft: spacing.lg,
    alignItems: 'flex-end',
  },
  smallTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  weekdaysRow: {
    marginTop: spacing.xs,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: spacing.xs,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: spacing.xs,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
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
  bsRowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeWheelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    marginVertical: spacing.lg,
    position: 'relative',
  },
  wheelColumn: {
    width: 80,
    height: 120,
  },
  wheelItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 16,
  },
  wheelOverlay: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    height: 40,
    justifyContent: 'space-between',
  },
  wheelLine: {
    height: 1,
    width: '100%',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
