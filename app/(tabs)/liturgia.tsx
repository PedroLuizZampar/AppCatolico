import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { CalendarModal } from '@/components/CalendarModal';
import { ErrorState } from '@/components/ErrorState';
import { useSelectedDate } from '@/lib/context/DateContext';
import { getLiturgiaCache, saveLiturgiaCache } from '@/lib/sqlite/sqliteDatabase';
import { formatDateISO } from '@/lib/santoDoDia';
import { capitalizeWordsExceptDe, formatDatePT } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';


// --- Interfaces de Dados (Tipagem) ---
interface LeituraItem {
  referencia: string;
  titulo: string;
  texto: string;
}

interface SalmoItem {
  referencia: string;
  refrao: string;
  texto: string;
}

interface LeituraExtra {
  tipo?: string;       // ex: "Terceira Leitura", "Epístola"
  titulo?: string;
  referencia?: string;
  texto?: string;
}

interface LiturgyData {
  data: string;
  liturgia: string;
  cor: string;
  leituras: {
    primeiraLeitura: LeituraItem[];
    salmo: SalmoItem[];
    segundaLeitura: LeituraItem[];
    evangelho: LeituraItem[];
    extras?: LeituraExtra[];
  };
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api-sanctus.onrender.com';

// --- Mapeamento de Cores ---
const liturgicalColorMap: { [key: string]: string } = {
  'branco': '#FFFFFF',
  'white': '#FFFFFF',
  'verde': '#4CAF50',
  'green': '#4CAF50',
  'roxo': '#9C27B0',
  'purple': '#9C27B0',
  'vermelho': '#F44336',
  'red': '#F44336',
  'rosa': '#E91E63',
  'rose': '#E91E63',
};

// --- Função Helper para processar versículos ---
const renderTextWithSuperscript = (text: string, color: string, reference: string = '') => {
  // 1. Identificar versículos válidos a partir da referência
  // A referência (ex: "Eclo 3, 3-7. 14-17a") é a "dica" do que é versículo.
  const validVerses = new Set<string>();

  // Regex para capturar intervalos (ex: 3-7, 14-17)
  // Suporta hífen comum (-) e travessão (–)
  const rangeRegex = /(\d+)([a-d])?\s*[-–]\s*(\d+)([a-d])?/g;
  let match;
  
  // Primeiro pass: Intervalos
  while ((match = rangeRegex.exec(reference)) !== null) {
    const startNum = parseInt(match[1], 10);
    const endNum = parseInt(match[3], 10);
    const endLetter = match[4]; // Captura a letra final do intervalo (ex: 'a' em 17a)
    
    if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
      for (let i = startNum; i <= endNum; i++) {
        validVerses.add(i.toString());
        // Se for o último número e tiver letra, adiciona a versão com letra também
        if (i === endNum && endLetter) {
          validVerses.add(i.toString() + endLetter);
        }
      }
    }
  }

  // Segundo pass: Números individuais e letras explícitas (ex: 17a, 3, 14)
  const singleRegex = /(\d+)([a-d])?/g;
  while ((match = singleRegex.exec(reference)) !== null) {
    const num = match[1];
    const letter = match[2];
    validVerses.add(num);
    if (letter) validVerses.add(num + letter);
  }

  // 2. Pré-processamento: Separar números/letras do texto colado
  let processedText = text;
  let lastVerseNumber = 0;

  // Normaliza marcações do tipo "4, 1Caríssimos" ou "4, 1 Caríssimos" para "4,1 Caríssimos"
  // (capítulo,versículo) - comum quando a leitura atravessa capítulos
  processedText = processedText.replace(
    /(\d+)\s*,\s*(\d+[a-d]?)(?=[A-Za-zÀ-ÖØ-öø-ÿ"“])/g,
    '$1,$2 '
  );
  // E garante que "4, 1" vire "4,1" quando já há espaços ao redor
  processedText = processedText.replace(/(\d+)\s*,\s*(\d+[a-d]?)/g, '$1,$2');

  // Corrige casos do tipo "24'O" (número + apóstrofo/aspas + letra), deixando apenas 1 espaço
  // (algumas fontes usam caracteres diferentes para apóstrofo)
  processedText = processedText.replace(/(\d+)[‘’'´`′](?=[A-Za-zÀ-ÖØ-öø-ÿ"“])/g, '$1 ');

  // Regex unificada para processar sequencialmente e manter estado do último versículo
  // Grupo 1/2: Número + Letras (captura letras Unicode, ex: à, á, ê, etc.)
  // Grupo 3: Número antes de Maiúscula/Aspas (17O)
  // Grupo 4: Número isolado (15)
  // Uso de 'u' para suportar escapes Unicode (\p{L})
  const tokenRegex = /(\d+)([\p{L}]+(?:-[\p{L}]+)*)|(\d+)(?=[A-ZÀ-Ú"“])|(\d+)/gu;

  processedText = processedText.replace(tokenRegex, (fullMatch, g1Num, g1Letters, g3Num, g4Num) => {
      // Caso 1: Número + Letras (ex: 16mas, 17ae)
      if (g1Num) {
          const num = parseInt(g1Num, 10);
          const letters = g1Letters;
          const firstLetter = letters[0];
          const potentialVerseWithLetter = `${g1Num}${firstLetter}`;

          // Prioridade 1: É um versículo com letra explícita? (ex: 17a)
          if (validVerses.has(potentialVerseWithLetter)) {
              lastVerseNumber = num;
              const rest = letters.substring(1);
              return `${g1Num}${firstLetter} ${rest}`;
          }

          // Prioridade 2: É um versículo numérico válido? (ex: 16 em 16mas)
          if (validVerses.has(g1Num)) {
              lastVerseNumber = num;
              return `${g1Num} ${letters}`;
          }

          // Prioridade 3: Sequência lógica (ex: 30anos, se anterior foi 29)
          if (lastVerseNumber > 0 && num === lastVerseNumber + 1) {
              lastVerseNumber = num;
              return `${g1Num} ${letters}`;
          }

          // Não é versículo, mantém colado (ex: 30anos isolado)
          return fullMatch;
      }

      // Caso 2: Número antes de Maiúscula (ex: 17O)
      if (g3Num) {
          const num = parseInt(g3Num, 10);
          // Verifica se é versículo ou sequência
          if (validVerses.has(g3Num) || (lastVerseNumber > 0 && num === lastVerseNumber + 1)) {
              lastVerseNumber = num;
              return `${g3Num} `; // Adiciona espaço
          }
          return fullMatch;
      }

      // Caso 3: Número isolado (ex: 15)
      if (g4Num) {
          const num = parseInt(g4Num, 10);
          if (validVerses.has(g4Num) || (lastVerseNumber > 0 && num === lastVerseNumber + 1)) {
              lastVerseNumber = num;
          }
          return fullMatch; // Não altera, só atualiza estado
      }
      
      return fullMatch;
  });

  // 3. Renderização (Lógica original de split, agora com texto limpo)
  const parts: { isNumber: boolean; text: string }[] = [];
  
  // Split inteligente: Procura por "Número+Letra(opcional)" isolado por espaços ou pontuação
  const splitRegex = /(\d+,\d+[a-d]?|\d+[a-d]?)(?=\s)/g;
  
  const tokens = processedText.split(splitRegex);

  tokens.forEach(token => {
    if (!token) return;
    // Verifica se é estritamente um número de versículo (ex: "17", "17a")
    if (/^\d+,\d+[a-d]?$/.test(token) || /^\d+[a-d]?$/.test(token)) {
      parts.push({ isNumber: true, text: token });
    } else {
      parts.push({ isNumber: false, text: token });
    }
  });

  return (
    <View style={styles.textContainer}>
      <Text style={[styles.readingBody, { color }]}>
        {parts.map((part, index) =>
          part.isNumber ? (
            <Text key={index} style={[styles.superscript, { color: color + 'CC' }]}>
              {' '}{part.text}{' '}
            </Text>
          ) : (
            <Text key={index}>{part.text}</Text>
          )
        )}
      </Text>
    </View>
  );
};

// --- Componentes de Leitura (Cards de Página) ---

// --- Funções Auxiliares para Renderização de Markdown em Linha ---
const parseMarkdownText = (text: string, style: any) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={[style, { fontWeight: 'bold' }]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={index} style={[style, { fontStyle: 'italic' }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={index} style={style}>{part}</Text>;
  });
};

const renderMarkdownInPage = (markdown: string, colors: any) => {
  if (!markdown) return null;
  const lines = markdown.split('\n');
  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <View key={index} style={{ height: 8 }} />;
    }

    if (trimmed.startsWith('# ')) {
      const titleText = trimmed.slice(2).replace(/^\*\*|^\*|\*\*$|\*$/g, '');
      return (
        <Text key={index} style={[typography.h2, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>
          {parseMarkdownText(titleText, [typography.h2, { color: colors.text }])}
        </Text>
      );
    }
    if (trimmed.startsWith('## ')) {
      const titleText = trimmed.slice(3).replace(/^\*\*|^\*|\*\*$|\*$/g, '');
      return (
        <Text key={index} style={[typography.h3, { color: colors.text, marginTop: 14, marginBottom: 6 }]}>
          {parseMarkdownText(titleText, [typography.h3, { color: colors.text }])}
        </Text>
      );
    }
    if (trimmed.startsWith('### ')) {
      const titleText = trimmed.slice(4).replace(/^\*\*|^\*|\*\*$|\*$/g, '');
      return (
        <Text key={index} style={[typography.h4, { color: colors.text, marginTop: 12, marginBottom: 4 }]}>
          {parseMarkdownText(titleText, [typography.h4, { color: colors.text }])}
        </Text>
      );
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      return (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 8, marginVertical: 3 }}>
          <Text style={[typography.body, { color: colors.primary, marginRight: 6 }]}>•</Text>
          <Text style={{ flex: 1 }}>
            {parseMarkdownText(trimmed.slice(2), [typography.body, { color: colors.text }])}
          </Text>
        </View>
      );
    }

    return (
      <Text key={index} style={{ marginVertical: 6 }}>
        {parseMarkdownText(trimmed, [typography.body, { color: colors.text, lineHeight: 24 }])}
      </Text>
    );
  });
};

interface ReadingPageProps {
  title: string;
  data: LeituraItem;
  isDark: boolean;
}

const ReadingPage: React.FC<ReadingPageProps> = ({ title, data, isDark }) => {
  const colors = getColors(isDark);
  
  if (!data) return null;

  const isGospel = title.toLowerCase().includes('evangelho');

  // Normaliza e limpa o titulo para comparação
  const tituloClean = (data.titulo || '').replace(/✠/g, '').trim();

  // Remove o título duplicado do início do texto caso a API o inclua
  const cleanedTexto = (() => {
    let t = (data.texto || '').trim();
    if (!tituloClean || !t) return t;

    // Normaliza para comparação (sem acentos, lowercase)
    const normalizeForCompare = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

    const normTitulo = normalizeForCompare(tituloClean);
    const normTexto = normalizeForCompare(t);

    if (normTexto.startsWith(normTitulo)) {
      // Remove o título que está prefixado no texto
      t = t.slice(tituloClean.length).trim();
      // Remove possível separador residual
      t = t.replace(/^[\s—–\-:]+/, '').trim();
    }

    return t;
  })();

  return (
    <View style={styles.pageContainer}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.cardTitle, { color: colors.text, borderBottomColor: colors.divider }]}>
          {title}
        </Text>
        <Text style={[styles.readingReference, { color: colors.primary }]}>
          {data.referencia}
        </Text>
        <Text style={[styles.readingSubtitle, { color: colors.textSecondary }]}>
          {tituloClean}
        </Text>
        {renderTextWithSuperscript(cleanedTexto, colors.text, data.referencia)}

        {isGospel ? (
          <>
            <Text style={[styles.readingResponse, { color: colors.textSecondary }]}>— Palavra da Salvação</Text>
            <Text style={[styles.readingResponse, { color: colors.textSecondary }]}>— Glória a Vós Senhor</Text>
          </>
        ) : (
          <>
            <Text style={[styles.readingResponse, { color: colors.textSecondary }]}>— Palavra do Senhor</Text>
            <Text style={[styles.readingResponse, { color: colors.textSecondary }]}>— Graças a Deus</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};

interface SalmoPageProps {
  data?: SalmoItem;
  isDark: boolean;
}

const SalmoPage: React.FC<SalmoPageProps> = ({ data, isDark }) => {
  const colors = getColors(isDark);
  
  if (!data) return null;

  // Dividir o texto do salmo em versículos (separados por \n)
  const verses = data.texto.split('\n').filter(v => v.trim());

  return (
    <View style={styles.pageContainer}>
      <ScrollView contentContainerStyle={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.text, borderBottomColor: colors.divider }]}>
          Salmo Responsorial
        </Text>
        <Text style={[styles.readingReference, { color: colors.primary }]}>
          {data.referencia}
        </Text>
        <Text style={[styles.psalmResponse, { color: isDark ? '#FF6B6B' : '#d32f2f' }]}>
          R. {data.refrao}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          {verses.map((verse, index) => (
            <Text key={index} style={[styles.readingBody, { color: colors.text, marginBottom: spacing.sm }]}>
              {verse.replace(/^— /, '').replace(/^– /, '')}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};



// Converte nome ordinal por extenso (API) para formato "n° Leitura"
const ordinalMap: Record<string, string> = {
  'Primeira': '1ª', 'Segunda': '2ª', 'Terceira': '3ª', 'Quarta': '4ª',
  'Quinta': '5ª', 'Sexta': '6ª', 'Sétima': '7ª', 'Oitava': '8ª',
};
const normalizeReadingLabel = (tipo: string): string => {
  for (const [word, ordinal] of Object.entries(ordinalMap)) {
    if (tipo.startsWith(word)) {
      return tipo.replace(word, ordinal);
    }
  }
  return tipo; // Epístola e outros ficam como estão
};

// --- Componente Principal ---
export default function LiturgiaScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [liturgy, setLiturgy] = useState<LiturgyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [navOverflow, setNavOverflow] = useState<boolean | null>(null);
  const navBarWidth = React.useRef<number>(0);
  const flatListRef = React.useRef<FlatList>(null);
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const fetchLiturgy = async (date: Date) => {
    const dateStr = formatDateISO(date);
    try {
      setError(null);

      // 1. Tentar ler do SQLite local (Offline)
      const cached = await getLiturgiaCache(dateStr);
      if (cached) {
        setLiturgy(cached);
        setLoading(false);
        return;
      }

      // 2. Se não estiver no cache, chamar a nossa API Sanctus
      const url = `${API_BASE_URL}/api/v1/liturgia?date=${dateStr}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('404');
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const json = await response.json();
      setLiturgy(json);

      // Salvar no SQLite local silenciosamente
      await saveLiturgiaCache(dateStr, JSON.stringify(json));
    } catch (err: any) {
      console.warn('[Liturgia] Erro ao obter dados do servidor:', err);
      const cachedFallback = await getLiturgiaCache(dateStr);
      if (cachedFallback) {
        setLiturgy(cachedFallback);
      } else {
        setLiturgy(null);
        if (err.message === '404') {
          setError('Não existem registros de Liturgia Diária para a data selecionada.');
        } else {
          setError('Não foi possível obter a liturgia para a data selecionada. Verifique sua conexão com a internet.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiturgy(selectedDate);
  }, [selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setLoading(true);
    setActivePageIndex(0);
    setNavOverflow(null);
  };

  const pages = useMemo(() => {
    if (!liturgy?.leituras) return [];

    const { leituras } = liturgy;
    const allPages: { type: string; title: string; navTitle: string; data: any }[] = [];

    // Índice para percorrer os salmos sequencialmente
    let salmoIndex = 0;
    const totalSalmos = leituras.salmo?.length ?? 0;

    const pushSalmo = (label: string) => {
      if (salmoIndex < totalSalmos) {
        allPages.push({
          type: 'salmo',
          title: 'Salmo',
          navTitle: label,
          data: leituras.salmo[salmoIndex],
        });
        salmoIndex++;
      }
    };

    // 1ª Leitura (usa apenas a forma longa, índice 0)
    if (leituras.primeiraLeitura?.length > 0) {
      allPages.push({
        type: 'reading',
        title: '1ª Leitura',
        navTitle: '1ª Leitura',
        data: leituras.primeiraLeitura[0],
      });
      pushSalmo('Salmo');
    }

    // 2ª Leitura (ex: Gênesis – Abraão na Vigília)
    if (leituras.segundaLeitura?.length > 0) {
      allPages.push({
        type: 'reading',
        title: '2ª Leitura',
        navTitle: '2ª Leitura',
        data: leituras.segundaLeitura[0],
      });
      pushSalmo('Salmo');
    }

    // Leituras extras (Vigília Pascal: 3ª, 4ª, 5ª, 6ª, 7ª, Epístola)
    const extrasLeituras = (leituras.extras ?? []).filter(
      (e) => e.tipo && e.referencia && e.texto
    );
    extrasLeituras.forEach((extra, idx) => {
      const rawLabel = extra.tipo ?? `${idx + 3}ª Leitura`;
      const label = normalizeReadingLabel(rawLabel);
      allPages.push({
        type: 'reading',
        title: label,
        navTitle: label,
        data: {
          referencia: extra.referencia ?? '',
          titulo: extra.titulo ?? '',
          texto: extra.texto ?? '',
        } as LeituraItem,
      });
      // Para cada leitura extra que não seja a Epístola, consome um salmo
      if (extra.tipo !== 'Epístola') {
        pushSalmo('Salmo');
      }
    });

    // Consome quaisquer salmos restantes (ex: Aleluia após Epístola)
    while (salmoIndex < totalSalmos) {
      pushSalmo('Salmo');
    }

    // Evangelho
    if (leituras.evangelho?.length > 0) {
      allPages.push({
        type: 'evangelho',
        title: 'Evangelho',
        navTitle: 'Evangelho',
        data: leituras.evangelho[0],
      });
    }

    return allPages;
  }, [liturgy]);

  const renderPage = ({ item }: { item: any }) => {
    switch (item.type) {
      case 'reading':
        return <ReadingPage title={item.title} data={item.data} isDark={isDark} />;
      case 'evangelho':
        return <ReadingPage title="Evangelho" data={item.data} isDark={isDark} />;
      case 'salmo':
        return <SalmoPage data={item.data} isDark={isDark} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando liturgia...
        </Text>
      </View>
    );
  }

  if (error || !liturgy) {
    return (
      <ErrorState
        title="Erro ao carregar liturgia"
        message={error || 'Dados não encontrados.'}
        onRetry={() => {
          setLoading(true);
          fetchLiturgy(selectedDate);
        }}
      />
    );
  }

  const liturgyColor = liturgicalColorMap[liturgy?.cor?.toLowerCase() || ''] || '#7f8c8d';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CalendarModal
        visible={showCalendar}
        selectedDate={selectedDate}
        onClose={() => setShowCalendar(false)}
        onSelectDate={handleDateSelect}
      />

      {/* Cabeçalho centralizado */}
      <Animated.View 
        entering={FadeInDown.duration(400)}
        style={styles.pageHeader}
      >
        <Text style={[styles.mainTitle, { color: colors.text }]}>
          {liturgy.liturgia}
        </Text>
        <Pressable 
          onPress={() => setShowCalendar(true)}
          style={({ pressed }) => [
            styles.dateButton,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <View 
            style={[
              styles.colorIndicator, 
              { backgroundColor: liturgyColor, borderColor: colors.border }
            ]} 
          />
          <Ionicons name="calendar" size={16} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.primary }]}>
            {capitalizeWordsExceptDe(formatDatePT(selectedDate))}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Navbar de Navegação entre Leituras */}
      {pages.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(500).delay(200)}
          style={[styles.navBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          onLayout={(e) => { navBarWidth.current = e.nativeEvent.layout.width; }}
        >
          <ScrollView
            horizontal
            scrollEnabled={navOverflow === true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.navBarContent,
              // Preenche a barra só quando confirmado que cabe sem scroll
              navOverflow === false && { width: navBarWidth.current },
            ]}
            onContentSizeChange={(contentWidth) => {
              if (navBarWidth.current > 0) {
                setNavOverflow(contentWidth > navBarWidth.current + 1);
              }
            }}
          >
            {pages.map((page, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  setActivePageIndex(index);
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                }}
                style={[
                  styles.navButton,
                  // flex:1 só quando confirmado que não há overflow
                  navOverflow === false && { flex: 1 },
                  activePageIndex === index && {
                    backgroundColor: colors.primary + '15',
                    borderBottomWidth: 3,
                    borderBottomColor: colors.primary,
                  }
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.navButtonText,
                    { color: activePageIndex === index ? colors.primary : colors.textSecondary },
                    activePageIndex === index && { fontWeight: '700' }
                  ]}
                >
                  {page.navTitle}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Lista de Páginas com Rolagem Lateral */}
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderPage}
        keyExtractor={(item, index) => item.type + index}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setActivePageIndex(index);
        }}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />
    </View>
  );
}

// --- Estilos ---
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  pageHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  mainTitle: {
    ...typography.h3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dateText: {
    ...typography.body,
    flexShrink: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  navBar: {
    borderBottomWidth: 1,
    paddingVertical: spacing.xs,
  },
  navBarContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  navButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    flexShrink: 0,
  },
  navButtonText: {
    ...typography.small,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 0,
  },
  pageContainer: {
    width: width,
    padding: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  cardContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  textContainer: {
    width: '100%',
  },
  cardTitle: {
    ...typography.h3,
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  readingReference: {
    ...typography.body,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  readingSubtitle: {
    ...typography.small,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  readingBody: {
    ...typography.bodyLarge,
    lineHeight: 30,
    textAlign: 'justify',
    includeFontPadding: false,
  },
  superscript: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  readingResponse: {
    ...typography.body,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  psalmResponse: {
    ...typography.body,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginVertical: spacing.md,
  },
  // Estilos do Calendário
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  quickSelectText: {
    ...typography.small,
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  calendarMonth: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  weekDay: {
    ...typography.small,
    fontWeight: '600',
    width: '14.28%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  calendarDayText: {
    ...typography.body,
  },
  closeButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  closeButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  meditationSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  meditationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  meditationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meditationEmoji: {
    fontSize: 20,
  },
  meditationSectionTitle: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  reloadButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  meditationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    justifyContent: 'center',
  },
  meditationLoadingText: {
    ...typography.small,
  },
  meditationErrorContainer: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  meditationErrorText: {
    ...typography.small,
    textAlign: 'center',
  },
  retryMeditationButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryMeditationButtonText: {
    ...typography.small,
    color: '#fff',
    fontWeight: '600',
  },
  meditationContentCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
  },
});
