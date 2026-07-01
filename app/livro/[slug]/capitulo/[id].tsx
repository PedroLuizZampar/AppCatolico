import { MeditationShareCard } from '@/components/MeditationShareCard';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Animated as RNAnimated, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { HighlightableText, HighlightCoverage } from '@/components/HighlightableText';
import { HIGHLIGHT_COLORS, HighlightColorPanel } from '@/components/HighlightColorPanel';
import { getBookBySlug } from '@/lib/data';
import { useFavoritesSync } from '@/lib/hooks/useFavoritesSync';
import { useHighlights } from '@/lib/hooks/useHighlights';
import { resolveHighlightConflicts } from '@/lib/highlightResolver';
import { getRosarioImageSource } from '@/lib/rosario';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { FavoriteParagraph, TextHighlight } from '@/lib/types';
import { getViaSacraImageSource, getViaSacraStation } from '@/lib/viaSacra';
import { copyToClipboard, shareAsImage, shareText, showNotification } from '@/lib/webShare';
import misteriosRaw from '../../../../data/Rosário/Mistérios Terço.json';
import * as Haptics from 'expo-haptics';
import oracoesJson from '../../../../data/Rosário/Orações Terço.json';

const EMPTY_HIGHLIGHTS: TextHighlight[] = [];
const EMPTY_COVERAGES: HighlightCoverage[] = [];

// Componente para cada parágrafo (lógica e renderização)
const ParagraphItemComponent = ({
  paragraph,
  selected,
  favorito,
  colors,
  onPress,
  onLongPress,
  highlightOpacity,
  coverages,
  isHighlightMode,
  isEraseMode,
  selectedColor,
  isDark,
  pendingStartWord,
  pendingCrossFullCoverage,
  onWordTap,
  onRemoveHighlight,
}: {
  paragraph: { number: number; text: string };
  selected: boolean;
  favorito: boolean;
  colors: any;
  onPress: (paragraphNum: number) => void;
  onLongPress: (paragraphNum: number) => void;
  highlightOpacity?: RNAnimated.Value;
  coverages: HighlightCoverage[];
  isHighlightMode: boolean;
  isEraseMode: boolean;
  selectedColor: string;
  isDark: boolean;
  pendingStartWord?: number;
  pendingCrossFullCoverage?: boolean;
  onWordTap: (paragraphNumber: number, wordIndex: number) => void;
  onRemoveHighlight: (highlightId: string) => void;
}) => {
  const fallbackOpacity = useRef(new RNAnimated.Value(0)).current;
  if (!highlightOpacity) {
    fallbackOpacity.setValue(selected ? 1 : 0);
  }
  const backgroundOpacity = highlightOpacity || fallbackOpacity;

  const handlePress = useCallback(() => {
    onPress(paragraph.number);
  }, [onPress, paragraph.number]);

  const handleLongPress = useCallback(() => {
    onLongPress(paragraph.number);
  }, [onLongPress, paragraph.number]);

  return (
    <Pressable
      onPress={isHighlightMode ? undefined : handlePress}
      onLongPress={isHighlightMode ? undefined : handleLongPress}
      delayLongPress={300}
      style={[
        styles.paragraphContainer,
        favorito && styles.paragraphFavorite,
      ]}
    >
      {selected && !isHighlightMode && (
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
              opacity: backgroundOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.2],
              }),
            },
          ]}
        />
      )}
      <View style={styles.paragraphContent}>
        <Text style={[styles.paragraphNumber, { color: colors.primary }]}>
          {paragraph.number}
        </Text>
        <View style={styles.paragraphTextContainer}>
          {isHighlightMode || coverages.length > 0 ? (
            <HighlightableText
              text={paragraph.text}
              coverages={coverages}
              isHighlightMode={isHighlightMode}
              isEraseMode={isEraseMode}
              selectedColor={selectedColor}
              isDark={isDark}
              paragraphNumber={paragraph.number}
              pendingStartWord={pendingStartWord}
              pendingCrossFullCoverage={pendingCrossFullCoverage}
              onWordTap={onWordTap}
              onRemoveHighlight={onRemoveHighlight}
              textStyle={[styles.paragraphText, { color: colors.text }]}
            />
          ) : (
            <Text style={[styles.paragraphText, { color: colors.text }]}>
              {paragraph.text}
            </Text>
          )}
        </View>
      </View>
      {favorito && (
        <Ionicons
          name="heart"
          size={14}
          color={colors.error}
          style={styles.favoriteIcon}
        />
      )}
    </Pressable>
  );
};

const areHighlightsEqual = (arr1: HighlightCoverage[], arr2: HighlightCoverage[]) => {
  if (arr1 === arr2) return true;
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    const c1 = arr1[i];
    const c2 = arr2[i];
    if (
      c1.highlight.id !== c2.highlight.id ||
      c1.highlight.color !== c2.highlight.color ||
      c1.type !== c2.type ||
      c1.startWord !== c2.startWord ||
      c1.endWord !== c2.endWord
    ) {
      return false;
    }
  }
  return true;
};

const ParagraphItem = React.memo(ParagraphItemComponent);

// Formata lista de números para exibir intervalos (ex: 1, 2, 3 -> "1-3")
const formatNumberRanges = (numbers: number[]): string => {
  if (numbers.length === 0) return '';
  const sorted = [...numbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === end + 1) {
      end = n;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = n;
      end = n;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
};

const INTRO_PARAGRAPHS = [
  {
    number: 1,
    label: oracoesJson.sinal_da_cruz.titulo,
    text: oracoesJson.sinal_da_cruz.conteudo,
  },
  {
    number: 2,
    label: oracoesJson.oferecimento.titulo,
    text: oracoesJson.oferecimento.conteudo,
  },
  {
    number: 3,
    label: oracoesJson.pai_nosso.titulo,
    text: oracoesJson.pai_nosso.conteudo,
  },
  {
    number: 4,
    label: 'Três Ave-Marias',
    text: `${oracoesJson.ave_maria.conteudo}\n\n(Rezar três vezes em honra à Santíssima Trindade por mais fé, esperança e caridade)`,
  }
];

const CONCLUSAO_PARAGRAPHS = [
  {
    number: 1,
    label: oracoesJson.agradecimento.titulo,
    text: oracoesJson.agradecimento.conteudo,
  },
  {
    number: 2,
    label: oracoesJson.salve_rainha.titulo,
    text: oracoesJson.salve_rainha.conteudo,
  }
];

export default function ChapterScreen() {
  const { slug, id, paragraph, fluxo, completo, tipo } = useLocalSearchParams<{ slug: string; id: string; paragraph?: string; fluxo?: string; completo?: string; tipo?: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const flatListRef = useRef<FlatList>(null);
  const shareCardRef = useRef<View>(null);
  const highlightOpacity = useRef(new RNAnimated.Value(0)).current;
  const { favorites, isFavorite: checkIsFavorite, addFavorites, removeFavorites } = useFavoritesSync();
  const { highlights, removeHighlight, updateChapterHighlights } = useHighlights();

  const [selectedParagraphs, setSelectedParagraphs] = useState<number[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);
  const [isDeepLinking, setIsDeepLinking] = useState(false);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [isEraseMode, setIsEraseMode] = useState(false);
  const [pendingHighlight, setPendingHighlight] = useState<{
    paragraphNumber: number;
    wordIndex: number;
  } | null>(null);

  const [beadCount, setBeadCount] = useState(0);



  // Refs mutáveis para valores usados em callbacks estáveis
  const selectedParagraphsRef = useRef(selectedParagraphs);
  selectedParagraphsRef.current = selectedParagraphs;
  const longPressActiveRef = useRef(longPressActive);
  longPressActiveRef.current = longPressActive;
  const isHighlightModeRef = useRef(isHighlightMode);
  isHighlightModeRef.current = isHighlightMode;
  const selectedHighlightColorRef = useRef(selectedHighlightColor);
  selectedHighlightColorRef.current = selectedHighlightColor;
  const pendingHighlightRef = useRef(pendingHighlight);
  pendingHighlightRef.current = pendingHighlight;




  // Gestos para o menu flutuante
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const context = useSharedValue({ x: 0, y: 0 });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
      translateY.value = event.translationY + context.value.y;
    });

  const animatedMenuStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Resetar posição do menu quando fechar
  useEffect(() => {
    if (!showMenu) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  }, [showMenu, translateX, translateY]);

  // Converter ID para número
  const currentChapterId = parseInt(id || '1', 10);

  const prevFluxoRef = useRef(fluxo);
  const prevChapterIdRef = useRef(currentChapterId);

  // Carregar dados
  const book = getBookBySlug(slug);
  const initialChapter = useMemo(() => {
    return book?.data.chapters.find(c => c.chapter === currentChapterId) || null;
  }, [slug, currentChapterId]);

  const [chapter, setChapter] = useState<any>(initialChapter);

  useEffect(() => {
    setChapter(initialChapter);
  }, [initialChapter]);

  useEffect(() => {
    import('@/lib/sqlite/sqliteDatabase')
      .then(({ getChapterFromDb }) => getChapterFromDb(slug, currentChapterId))
      .then(res => {
        if (res) {
          setChapter({
            chapter: res.chapter_num,
            name: res.chapter_name,
            paragraphs: res.paragraphs.map(p => ({
              number: p.paragraph_num,
              label: p.label || undefined,
              text: p.text
            }))
          });
        }
      })
      .catch(err => console.error('[SQLite] Erro ao carregar capítulo do livro:', err));
  }, [slug, currentChapterId]);
  const isCatecismo = slug === 'catecismo';
  const isViaSacra = slug === 'via-sacra';
  const isFrasesDeSantos = slug === 'frases-de-santos';
  const isMisteriosTerco = slug === 'misterios-terco';

  const viaSacraImage = useMemo(() => {
    if (!isViaSacra) return undefined;
    return getViaSacraImageSource(currentChapterId);
  }, [isViaSacra, currentChapterId]);

  const rosarioImage = useMemo(() => {
    if (!isMisteriosTerco) return undefined;
    return getRosarioImageSource(currentChapterId);
  }, [isMisteriosTerco, currentChapterId]);

  const findMysteryByGlobalIndex = (index: number) => {
    let counter = 0;
    for (const grupo of (misteriosRaw as any[])) {
      for (const m of grupo.misterios) {
        if (counter === index) return { ...m, grupo: grupo.grupo };
        counter += 1;
      }
    }
    return null;
  };

  const viaSacraStationLabel = useMemo(() => {
    if (!isViaSacra || !chapter?.name) return undefined;
    // chapter.name vem como "1° Estação — Título"; queremos só "1° Estação"
    return chapter.name.split('—')[0]?.trim() || chapter.name;
  }, [isViaSacra, chapter?.name]);

  const chapterIndicatorLabel = useMemo(() => {
    if (isCatecismo) return chapter?.name;
    if (isViaSacra) return viaSacraStationLabel ?? chapter?.name;
    if (isFrasesDeSantos) return chapter?.name;
    if (isMisteriosTerco) {
      if (fluxo === 'intro') return 'Orações iniciais';
      if (fluxo === 'conclusao') return 'Orações Finais';
      return chapter?.name;
    }
    return chapter?.name;
  }, [isCatecismo, isViaSacra, isFrasesDeSantos, isMisteriosTerco, chapter?.name, viaSacraStationLabel, fluxo]);

  // Função para navegar para a Bíblia baseado em uma string de referência
  const handleNavigateToBible = useCallback((referencia: string) => {
    if (!referencia) return;

    const bookSlugMap: Record<string, string> = {
      'mateus': 'sao-mateus',
      'marcos': 'sao-marcos',
      'lucas': 'sao-lucas',
      'joao': 'sao-joao',
      'atos': 'atos-dos-apostolos',
      'sao-mateus': 'sao-mateus',
      'sao-marcos': 'sao-marcos',
      'sao-lucas': 'sao-lucas',
      'sao-joao': 'sao-joao',
      'atos-dos-apostolos': 'atos-dos-apostolos',
    };

    const cleanRef = referencia.replace(/\(.*\)/g, '').trim();
    const match = cleanRef.match(/^(.+?)\s+(\d+)\s*,\s*([\d\s\-,]+)/);
    if (!match) return;

    const livroNomeRaw = match[1].trim();
    const capituloId = match[2];
    const versiculosRaw = match[3].trim();

    const normalizedLivro = livroNomeRaw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const livroSlug = bookSlugMap[normalizedLivro] || normalizedLivro;

    let versiculosQuery = versiculosRaw;
    const rangeMatch = versiculosRaw.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!isNaN(start) && !isNaN(end) && start < end) {
        const arr = [];
        for (let v = start; v <= end; v++) {
          arr.push(v);
        }
        versiculosQuery = arr.join(',');
      }
    } else {
      versiculosQuery = versiculosRaw.replace(/\s+/g, '');
    }

    router.push({
      pathname: '/biblia/[livro]/capitulo/[id]',
      params: {
        livro: livroSlug,
        id: capituloId,
        paragraph: versiculosQuery,
      },
    } as any);
  }, [router]);



  const range = useMemo(() => {
    if (!isMisteriosTerco) return null;
    if (completo === 'true') {
      return { start: 1, end: 20, name: 'Santo Rosário Completo' };
    }
    if (currentChapterId >= 1 && currentChapterId <= 5) return { start: 1, end: 5, name: 'Mistérios Gozosos' };
    if (currentChapterId >= 6 && currentChapterId <= 10) return { start: 6, end: 10, name: 'Mistérios Luminosos' };
    if (currentChapterId >= 11 && currentChapterId <= 15) return { start: 11, end: 15, name: 'Mistérios Dolorosos' };
    if (currentChapterId >= 16 && currentChapterId <= 20) return { start: 16, end: 20, name: 'Mistérios Gloriosos' };
    return { start: 1, end: 5, name: 'Mistérios Gozosos' };
  }, [isMisteriosTerco, currentChapterId, completo]);

  // Navegação entre capítulos
  const handlePrevChapter = () => {
    if (!book) return;

    if (isMisteriosTerco && range) {
      if (fluxo === 'intro') {
        if (beadCount > 0) {
          setBeadCount(prev => prev - 1);
        }
        return;
      }
      if (fluxo === 'conclusao') {
        // Volta para o último mistério do grupo
        router.setParams({ id: range.end.toString(), fluxo: '' });
        return;
      }
      if (currentChapterId === range.start) {
        // Volta para a introdução
        router.setParams({ id: range.start.toString(), fluxo: 'intro' });
        return;
      }
      // Navega para o mistério anterior
      router.setParams({ id: (currentChapterId - 1).toString(), fluxo: '' });
      return;
    }

    const currentIndex = book.data.chapters.findIndex(c => c.chapter === currentChapterId);
    if (currentIndex > 0) {
      const prevChapter = book.data.chapters[currentIndex - 1];
      router.setParams({ id: prevChapter.chapter.toString() });
    }
  };

  const handleNextChapter = () => {
    if (!book) return;

    if (isMisteriosTerco && range) {
      if (fluxo === 'intro') {
        if (beadCount < 6) {
          setBeadCount(prev => prev + 1);
        } else {
          // Avança para o primeiro mistério
          router.setParams({ id: range.start.toString(), fluxo: '' });
        }
        return;
      }
      if (fluxo === 'conclusao') {
        // Já está na conclusão
        return;
      }
      if (currentChapterId === range.end) {
        // Vai para a conclusão
        router.setParams({ id: range.end.toString(), fluxo: 'conclusao' });
        return;
      }
      // Navega para o próximo mistério
      router.setParams({ id: (currentChapterId + 1).toString(), fluxo: '' });
      return;
    }

    const currentIndex = book.data.chapters.findIndex(c => c.chapter === currentChapterId);
    if (currentIndex < book.data.chapters.length - 1) {
      const nextChapter = book.data.chapters[currentIndex + 1];
      router.setParams({ id: nextChapter.chapter.toString() });
    }
  };

  const handleFinish = () => {
    router.replace('/');
  };

  // Resetar scroll e seleção ao mudar de capítulo ou fluxo
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
    setSelectedParagraphs([]);
    setShowMenu(false);
    setLongPressActive(false);

    // Inicia beadCount em 6 se veio de um mistério voltando para a introdução
    if (isMisteriosTerco && fluxo === 'intro' && prevFluxoRef.current === '') {
      setBeadCount(6);
    } else {
      setBeadCount(0);
    }

    prevFluxoRef.current = fluxo;
    prevChapterIdRef.current = currentChapterId;
  }, [currentChapterId, fluxo]);

  // Scroll até o parágrafo específico (deep link ou busca)
  useEffect(() => {
    if (isViaSacra || isMisteriosTerco) return;
    if (paragraph && chapter) {
      const paragraphs = paragraph.split(',').map(p => parseInt(p)).filter(n => !isNaN(n));

      if (paragraphs.length > 0) {
        // Encontrar o índice do parágrafo na lista
        const index = chapter.paragraphs.findIndex(p => p.number === paragraphs[0]);

        if (index !== -1) {
          // Tentar scrollar imediatamente se possível, ou aguardar
          const tryScroll = (attempts = 0) => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.3
              });

              // Aplicar highlight
              setSelectedParagraphs(paragraphs);
              setIsDeepLinking(true);
              highlightOpacity.setValue(1);

              setTimeout(() => {
                RNAnimated.timing(highlightOpacity, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: true,
                }).start(() => {
                  setIsDeepLinking(false);
                });
              }, 1500);
            } else if (attempts < 5) {
              // Se a ref não estiver pronta, tentar novamente em breve
              setTimeout(() => tryScroll(attempts + 1), 200);
            }
          };

          // Pequeno delay inicial para garantir montagem
          setTimeout(() => tryScroll(), 500);
        }
      }
    }
  }, [paragraph, currentChapterId, chapter, isViaSacra, isMisteriosTerco, highlightOpacity]);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
    setSelectedParagraphs([]);
    setLongPressActive(false);
  }, []);

  // --- Highlight / Grifo ---
  const canHighlight = !isViaSacra && !isMisteriosTerco;

  const favoritesSet = useMemo(() => {
    const set = new Set<number>();
    for (const fav of favorites) {
      if (fav.bookSlug === slug && fav.chapterId === currentChapterId) {
        set.add(fav.paragraphNumber);
      }
    }
    return set;
  }, [favorites, slug, currentChapterId]);

  const targetParagraphs = useMemo(() => {
    if (isViaSacra || isMisteriosTerco) return [];
    return paragraph ? paragraph.split(',').map(p => parseInt(p)).filter(n => !isNaN(n)) : [];
  }, [paragraph, isViaSacra, isMisteriosTerco]);

  const coveragesByParagraph = useMemo(() => {
    if (!canHighlight || !chapter) return {};
    const map: Record<number, HighlightCoverage[]> = {};
    const chapterHighlights = highlights.filter(h => h.bookSlug === slug && h.chapterId === currentChapterId);

    for (const paragraph of chapter.paragraphs) {
      const pNum = paragraph.number;
      const text = paragraph.text;
      const tokens = text.split(/(\s+)/);
      const totalWords = tokens.filter((t: string) => t !== '' && !/^\s+$/.test(t)).length;

      const coverages: HighlightCoverage[] = [];

      for (const h of chapterHighlights) {
        const startP = h.paragraphNumber;
        const endP = h.endParagraphNumber ?? startP;

        if (pNum < startP || pNum > endP) {
          continue;
        }

        if (startP === endP) {
          if (pNum === startP) {
            coverages.push({
              highlight: h,
              type: 'partial',
              startWord: h.startWordIndex,
              endWord: h.endWordIndex,
            });
          }
        } else {
          if (pNum === startP) {
            coverages.push({
              highlight: h,
              type: 'startOnly',
              startWord: h.startWordIndex,
              endWord: totalWords - 1,
            });
          } else if (pNum === endP) {
            coverages.push({
              highlight: h,
              type: 'endOnly',
              startWord: 0,
              endWord: h.endWordIndexEnd ?? h.endWordIndex,
            });
          } else {
            coverages.push({
              highlight: h,
              type: 'full',
              startWord: 0,
              endWord: totalWords - 1,
            });
          }
        }
      }

      if (coverages.length > 0) {
        map[pNum] = coverages;
      }
    }

    return map;
  }, [highlights, slug, currentChapterId, chapter, canHighlight]);

  const createCrossParagraphHighlight = useCallback((
    start: { paragraphNumber: number; wordIndex: number },
    end: { paragraphNumber: number; wordIndex: number }
  ) => {
    if (!chapter) return;

    let pStart = start.paragraphNumber;
    let wStart = start.wordIndex;
    let pEnd = end.paragraphNumber;
    let wEnd = end.wordIndex;

    if (pStart > pEnd || (pStart === pEnd && wStart > wEnd)) {
      pStart = end.paragraphNumber;
      wStart = end.wordIndex;
      pEnd = start.paragraphNumber;
      wEnd = start.wordIndex;
    }

    let highlightedText = '';
    
    if (pStart === pEnd) {
      const p = chapter.paragraphs.find(item => item.number === pStart);
      if (p) {
        const tokens = p.text.split(/(\s+)/);
        const words = tokens.filter((t: string) => t !== '' && !/^\s+$/.test(t));
        highlightedText = words.slice(wStart, wEnd + 1).join(' ');
      }
    } else {
      const parts: string[] = [];
      for (let pNum = pStart; pNum <= pEnd; pNum++) {
        const p = chapter.paragraphs.find(item => item.number === pNum);
        if (!p) continue;
        const tokens = p.text.split(/(\s+)/);
        const words = tokens.filter((t: string) => t !== '' && !/^\s+$/.test(t));
        
        if (pNum === pStart) {
          parts.push(words.slice(wStart).join(' '));
        } else if (pNum === pEnd) {
          parts.push(words.slice(0, wEnd + 1).join(' '));
        } else {
          parts.push(words.join(' '));
        }
      }
      highlightedText = parts.join(' \n ');
    }

    const newHighlight: TextHighlight = {
      id: `${slug}-${currentChapterId}-${pStart}-${Date.now()}`,
      bookSlug: slug,
      chapterId: currentChapterId,
      paragraphNumber: pStart,
      startWordIndex: wStart,
      endWordIndex: pStart === pEnd ? wEnd : wStart,
      highlightedText,
      color: selectedHighlightColorRef.current,
      timestamp: Date.now(),
      type: 'livro',
      endParagraphNumber: pEnd,
      endWordIndexEnd: wEnd,
    };

    const chapterHighlights = highlights.filter(
      h => h.bookSlug === slug && h.chapterId === currentChapterId
    );

    const paragraphsInfo = chapter.paragraphs.map(p => ({
      number: p.number,
      text: p.text,
    }));

    const resolved = resolveHighlightConflicts(chapterHighlights, newHighlight, paragraphsInfo);

    updateChapterHighlights(slug, currentChapterId, resolved);
  }, [slug, currentChapterId, chapter, highlights, updateChapterHighlights]);

  const handleWordTap = useCallback((paragraphNum: number, wordIndex: number) => {
    if (isEraseMode) return;
    const currentPending = pendingHighlightRef.current;
    if (!currentPending) {
      setPendingHighlight({ paragraphNumber: paragraphNum, wordIndex });
    } else {
      createCrossParagraphHighlight(currentPending, { paragraphNumber: paragraphNum, wordIndex });
      setPendingHighlight(null);
    }
  }, [isEraseMode, createCrossParagraphHighlight]);

  const handleRemoveHighlight = useCallback((highlightId: string) => {
    removeHighlight(highlightId);
  }, [removeHighlight]);

  const toggleHighlightMode = useCallback(() => {
    setIsHighlightMode(prev => {
      if (!prev) handleCloseMenu();
      return !prev;
    });
    setIsEraseMode(false);
    setPendingHighlight(null);
  }, [handleCloseMenu]);

  // Handlers de seleção
  const handleParagraphPress = useCallback((paragraphNum: number) => {
    if (isViaSacra || isMisteriosTerco) return;
    if (isHighlightModeRef.current) return;
    if (longPressActiveRef.current) {
      if (selectedParagraphsRef.current.includes(paragraphNum)) {
        setSelectedParagraphs(prev => {
          const next = prev.filter(p => p !== paragraphNum);
          if (next.length === 0) {
            setShowMenu(false);
            setLongPressActive(false);
          }
          return next;
        });
      } else {
        setSelectedParagraphs(prev => [...prev, paragraphNum].sort((a, b) => a - b));
      }
    } else {
      if (selectedParagraphsRef.current.length === 1 && selectedParagraphsRef.current[0] === paragraphNum) {
        // Segundo toque no mesmo parágrafo: desmarcar de verdade
        handleCloseMenu();
      } else {
        setSelectedParagraphs([paragraphNum]);
        setShowMenu(true);
      }
    }
  }, [handleCloseMenu, isViaSacra, isMisteriosTerco]);

  const handleParagraphLongPress = useCallback((paragraphNum: number) => {
    if (isViaSacra || isMisteriosTerco) return;
    setLongPressActive(true);
    if (!selectedParagraphsRef.current.includes(paragraphNum)) {
      setSelectedParagraphs(prev => [...prev, paragraphNum].sort((a, b) => a - b));
    }
    setShowMenu(true);
  }, [isViaSacra, isMisteriosTerco]);

  // Ações do Menu
  const handleCopyParagraphs = async () => {
    if (selectedParagraphs.length === 0 || !chapter || !book) return;

    const textoParts = selectedParagraphs.map(num => {
      const p = chapter.paragraphs.find(p => p.number === num);
      return p ? `[${num}] ${p.text}` : '';
    }).filter(Boolean);

    const header = isCatecismo
      ? `CIC §[${formatNumberRanges(selectedParagraphs)}]`
      : `${book.title} - Cap. ${chapter.chapter}`;

    const textoCompleto = `${header}\n\n${textoParts.join('\n\n')}`;

    await copyToClipboard(textoCompleto);
    showNotification(`${selectedParagraphs.length} parágrafo(s) copiado(s).`, 'Copiado!');
    handleCloseMenu();
  };

  const handleFavoriteParagraphs = async () => {
    if (selectedParagraphs.length === 0 || !chapter || !book) return;

    try {
      const groupId = selectedParagraphs.length > 1 ? `${slug}-${currentChapterId}-${Date.now()}` : undefined;
      const groupRange = selectedParagraphs.length > 1 ? formatNumberRanges(selectedParagraphs) : undefined;

      const toAdd: FavoriteParagraph[] = [];
      const toRemove: FavoriteParagraph[] = [];

      for (const pNum of selectedParagraphs) {
        const p = chapter.paragraphs.find(item => item.number === pNum);
        if (!p) continue;

        const existingFav = isCatecismo
          ? favorites.find(fav => fav.bookSlug === 'catecismo' && fav.paragraphNumber === pNum)
          : favorites.find(
            fav => fav.bookSlug === slug &&
              fav.chapterId === currentChapterId &&
              fav.paragraphNumber === pNum
          );

        if (existingFav) {
          toRemove.push(existingFav);
        } else {
          toAdd.push({
            bookSlug: slug,
            bookTitle: book.title,
            chapterId: currentChapterId,
            chapterName: isCatecismo || isFrasesDeSantos ? chapter.name : `Capítulo ${chapter.chapter}`,
            paragraphNumber: pNum,
            paragraphText: p.text,
            timestamp: Date.now(),
            type: isFrasesDeSantos ? 'frases' : 'livro',
            groupId,
            groupRange,
          });
        }
      }

      if (toRemove.length > 0) {
        await removeFavorites(toRemove);
      }

      if (toAdd.length > 0) {
        await addFavorites(toAdd);
      }

      if (toAdd.length > 0) Alert.alert('Salvo!', `${toAdd.length} parágrafo(s) adicionado(s) aos favoritos.`);
      else if (toRemove.length > 0) Alert.alert('Removido', `${toRemove.length} parágrafo(s) removido(s) dos favoritos.`);

      handleCloseMenu();
    } catch (error) {
      console.error('Erro ao favoritar:', error);
      Alert.alert('Erro', 'Não foi possível salvar os favoritos.');
    }
  };

  const handleShareParagraphs = async () => {
    if (selectedParagraphs.length === 0 || !chapter || !book) return;

    if (selectedParagraphs.length === 1) {
      const p = chapter.paragraphs.find(item => item.number === selectedParagraphs[0]);
      const textoFallback = `${book.title}\n${isCatecismo ? `CIC §${selectedParagraphs[0]}` : `Cap. ${chapter.chapter} · ${chapter.name}`}\n\n"${p?.text ?? ''}"\n\n#${selectedParagraphs[0]} — Sanctus`;
      try {
        await shareAsImage(shareCardRef, textoFallback);
      } catch (e) {
        console.error(e);
        showNotification('Falha ao compartilhar.', 'Erro');
      }
      handleCloseMenu();
      return;
    }

    const textoParts = selectedParagraphs.map(num => {
      const p = chapter.paragraphs.find(item => item.number === num);
      return p ? `[${num}] ${p.text}` : '';
    }).filter(Boolean);

    const textoCompleto = `${book.title} - Cap. ${chapter.chapter}\n\n${textoParts.join('\n\n')}`;

    try {
      await shareText(textoCompleto);
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
    handleCloseMenu();
  };

  if (!book || !chapter) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Capítulo não encontrado
        </Text>
      </View>
    );
  }

  const currentIndex = book.data.chapters.findIndex(c => c.chapter === currentChapterId);
  const isFirstChapter = isMisteriosTerco
    ? (fluxo === 'intro' && beadCount === 0)
    : currentIndex === 0;
  const isLastChapter = isMisteriosTerco
    ? fluxo === 'conclusao'
    : currentIndex === book.data.chapters.length - 1;

  const isNextDisabled = isLastChapter || (isMisteriosTerco && (
    fluxo === 'intro' ? beadCount < 6 : (!fluxo && beadCount < 12)
  ));

  const currentIntroPrayer = useMemo(() => {
    if (!isMisteriosTerco || fluxo !== 'intro') return null;
    if (beadCount === 0) {
      return {
        titulo: oracoesJson.sinal_da_cruz.titulo,
        conteudo: oracoesJson.sinal_da_cruz.conteudo,
      };
    } else if (beadCount === 1) {
      return {
        titulo: completo === 'true' ? oracoesJson.oferecimento_rosario.titulo : oracoesJson.oferecimento.titulo,
        conteudo: completo === 'true' ? oracoesJson.oferecimento_rosario.conteudo : oracoesJson.oferecimento.conteudo,
      };
    } else if (beadCount === 2) {
      return {
        titulo: oracoesJson.creio.titulo,
        conteudo: oracoesJson.creio.conteudo,
      };
    } else if (beadCount === 3) {
      return {
        titulo: oracoesJson.pai_nosso.titulo,
        conteudo: oracoesJson.pai_nosso.conteudo,
      };
    } else if (beadCount === 4) {
      return {
        titulo: "1ª Ave Maria",
        conteudo: "1ª Ave Maria em honra a Deus Pai para nos aumentar a fé.\n\n" + oracoesJson.ave_maria.conteudo,
      };
    } else if (beadCount === 5) {
      return {
        titulo: "2ª Ave Maria",
        conteudo: "2ª Ave Maria em honra a Deus Filho para nos aumentar a esperança.\n\n" + oracoesJson.ave_maria.conteudo,
      };
    } else if (beadCount === 6) {
      return {
        titulo: "3ª Ave Maria",
        conteudo: "3ª Ave Maria em honra a Deus Espírito Santo para nos aumentar a caridade.\n\n" + oracoesJson.ave_maria.conteudo,
      };
    }
    return null;
  }, [isMisteriosTerco, fluxo, beadCount]);

  const currentMysteryPrayer = useMemo(() => {
    if (!isMisteriosTerco || fluxo) return null;
    if (beadCount === 0) {
      return {
        titulo: oracoesJson.pai_nosso.titulo,
        conteudo: oracoesJson.pai_nosso.conteudo,
      };
    } else if (beadCount >= 1 && beadCount <= 10) {
      return {
        titulo: `${oracoesJson.ave_maria.titulo} (${beadCount}/10)`,
        conteudo: oracoesJson.ave_maria.conteudo,
      };
    } else if (beadCount === 11) {
      return {
        titulo: oracoesJson.gloria.titulo,
        conteudo: oracoesJson.gloria.conteudo,
      };
    } else if (beadCount === 12) {
      return {
        titulo: oracoesJson.jaculatoria.titulo,
        conteudo: oracoesJson.jaculatoria.conteudo,
      };
    }
    return null;
  }, [isMisteriosTerco, fluxo, beadCount]);

  const dataToRender = useMemo(() => {
    if (isMisteriosTerco) {
      if (fluxo === 'intro') {
        return currentIntroPrayer ? [{ number: beadCount + 1, label: currentIntroPrayer.titulo, text: currentIntroPrayer.conteudo }] : [];
      }
      if (fluxo === 'conclusao') return CONCLUSAO_PARAGRAPHS;
    }
    return chapter?.paragraphs || [];
  }, [isMisteriosTerco, fluxo, chapter, currentIntroPrayer, beadCount]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isCatecismo
            ? 'Catecismo'
            : isMisteriosTerco
              ? (tipo === 'terco' ? 'Terço' : 'Mistérios do Rosário')
              : book.title,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: canHighlight ? () => (
            <Pressable onPress={toggleHighlightMode} style={{ paddingHorizontal: 12 }}>
              <Ionicons
                name={isHighlightMode ? 'brush' : 'brush-outline'}
                size={22}
                color={isHighlightMode ? colors.primary : colors.text}
              />
            </Pressable>
          ) : undefined,
        }}
      />

      {/* Grupo dos Mistérios (topo) */}
      {isMisteriosTerco && (() => {
        const mysteryGroup = findMysteryByGlobalIndex(currentChapterId - 1)?.grupo;
        if (!mysteryGroup) return null;
        return (
          <View style={[styles.mysteryGroupBanner, { backgroundColor: colors.surfaceLight, borderBottomColor: colors.border }]}>
            <Text style={[styles.mysteryGroupText, { color: colors.primary }]}>{mysteryGroup}</Text>
          </View>
        );
      })()}

      {/* Barra de Navegação Fixa no Topo */}
      <View
        style={[
          styles.navigationBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
          (isViaSacra || isMisteriosTerco) && { borderBottomWidth: 0 },
        ]}
      >
        <Pressable
          onPress={handlePrevChapter}
          disabled={isFirstChapter}
          style={[styles.navButton, isFirstChapter && styles.navButtonDisabled]}
        >
          <Ionicons name="chevron-back" size={24} color={isFirstChapter ? colors.textMuted : colors.primary} />
          <Text style={[styles.navButtonText, { color: isFirstChapter ? colors.textMuted : colors.primary }]}>
            Anterior
          </Text>
        </Pressable>

        <View style={styles.chapterIndicator}>
          <Text
            style={[
              styles.chapterIndicatorText,
              { color: colors.text },
              isViaSacra && styles.chapterIndicatorTextViaSacra,
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {chapterIndicatorLabel}
          </Text>
        </View>

        {isMisteriosTerco && fluxo === 'conclusao' ? (
          <Pressable
            onPress={handleFinish}
            style={styles.navButton}
          >
            <Text style={[styles.navButtonText, { color: colors.primary }]}>
              Concluir
            </Text>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleNextChapter}
            disabled={isNextDisabled}
            style={[styles.navButton, isNextDisabled && styles.navButtonDisabled]}
          >
            <Text style={[styles.navButtonText, { color: isNextDisabled ? colors.textMuted : colors.primary }]}>
              Próximo
            </Text>
            <Ionicons name="chevron-forward" size={24} color={isNextDisabled ? colors.textMuted : colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Contagem por dezena (bolinhas) ou orações iniciais */}
      {isMisteriosTerco && (fluxo === 'intro' || !fluxo) && (
        <View style={[styles.beadsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {fluxo === 'intro' ? (
            <>
              {beadCount <= 2 ? (
                <View style={styles.crossIndicatorContainer}>
                  <MaterialCommunityIcons name="cross" size={24} color={colors.primary} />
                </View>
              ) : (
                <View style={styles.beadsRow}>
                  {/* Bolinha do Pai Nosso (Índice 3) */}
                  <View
                    style={[
                      styles.bead,
                      styles.beadLarge,
                      {
                        borderColor: beadCount >= 4 ? colors.primary : colors.textMuted,
                        backgroundColor: beadCount >= 4 ? colors.primary : colors.surfaceLight,
                      },
                      beadCount === 3 && {
                        borderWidth: 2,
                        borderColor: colors.primary,
                        transform: [{ scale: 1.15 }],
                      }
                    ]}
                  />

                  {/* Bolinhas das 3 Ave-Marias (Índices 4 a 6) */}
                  {Array.from({ length: 3 }).map((_, index) => {
                    const beadIndex = index + 4;
                    const isPrayed = beadIndex < beadCount;
                    const isCurrent = beadIndex === beadCount;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.bead,
                          {
                            borderColor: isPrayed ? colors.primary : colors.textMuted,
                            backgroundColor: isPrayed ? colors.primary : colors.surfaceLight,
                          },
                          isCurrent && {
                            borderWidth: 2,
                            borderColor: colors.primary,
                            transform: [{ scale: 1.15 }],
                          }
                        ]}
                      />
                    );
                  })}
                </View>
              )}
              <Text style={[styles.beadsCountText, { color: colors.textSecondary }]}>
                {beadCount === 0
                  ? 'Sinal da Cruz'
                  : beadCount === 1
                    ? 'Oferecimento'
                    : beadCount === 2
                      ? 'Creio'
                      : beadCount === 3
                        ? 'Pai Nosso'
                        : `${beadCount - 3}ª Ave Maria`}
              </Text>
            </>
          ) : (
            <>
              {beadCount <= 10 && (
                <View style={styles.beadsRow}>
                  {/* Bolinha do Pai Nosso (Índice 0) */}
                  <View
                    style={[
                      styles.bead,
                      styles.beadLarge,
                      {
                        borderColor: beadCount >= 1 ? colors.primary : colors.textMuted,
                        backgroundColor: beadCount >= 1 ? colors.primary : colors.surfaceLight,
                      },
                      beadCount === 0 && {
                        borderWidth: 2,
                        borderColor: colors.primary,
                        transform: [{ scale: 1.15 }],
                      }
                    ]}
                  />

                  {/* Bolinhas das Ave-Marias (Índices 1 a 10) */}
                  {Array.from({ length: 10 }).map((_, index) => {
                    const beadIndex = index + 1;
                    const isPrayed = beadIndex < beadCount;
                    const isCurrent = beadIndex === beadCount;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.bead,
                          {
                            borderColor: isPrayed ? colors.primary : colors.textMuted,
                            backgroundColor: isPrayed ? colors.primary : colors.surfaceLight,
                          },
                          isCurrent && {
                            borderWidth: 2,
                            borderColor: colors.primary,
                            transform: [{ scale: 1.15 }],
                      }
                        ]}
                      />
                    );
                  })}
                </View>
              )}
              <Text style={[styles.beadsCountText, { color: colors.textSecondary }]}>
                {beadCount === 0
                  ? 'Pai Nosso'
                  : beadCount <= 10
                    ? `${beadCount} / 10 Ave-Marias`
                    : beadCount === 11
                      ? 'Glória ao Pai'
                      : 'Ó meu Jesus'}
              </Text>
            </>
          )}
        </View>
      )}

      {/* Menu Flutuante */}
      {!isViaSacra && !isMisteriosTerco && !isHighlightMode && showMenu && selectedParagraphs.length > 0 && (
        <GestureDetector gesture={panGesture}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.menuContainerFixed,
              { backgroundColor: colors.surface, borderColor: colors.border },
              animatedMenuStyle
            ]}
          >
            <View style={styles.menuHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="move" size={20} color={colors.textMuted} />
                <Text style={[styles.menuTitle, { color: colors.text }]}>
                  {selectedParagraphs.length} selecionado{selectedParagraphs.length > 1 ? 's' : ''}
                </Text>
              </View>
              <Pressable onPress={handleCloseMenu} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.menuActions}>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleCopyParagraphs}>
                <Ionicons name="copy" size={14} color={colors.primary} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Copiar</Text>
              </Pressable>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleFavoriteParagraphs}>
                <Ionicons name="heart" size={14} color={colors.error} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Favoritar</Text>
              </Pressable>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleShareParagraphs}>
                <Ionicons name="share" size={14} color={colors.primary} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Compartilhar</Text>
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
      )}

      {/* Lista de Parágrafos */}
      <FlatList
        ref={flatListRef}
        data={dataToRender}
        keyExtractor={(item) => item.number.toString()}
        ListHeaderComponent={
          isMisteriosTerco && fluxo ? (
            <View></View>
          ) : (isViaSacra && viaSacraImage) || (isMisteriosTerco && !fluxo && rosarioImage) ? (
            <View style={styles.viaSacraHeader}>
              {isMisteriosTerco ? (
                <View style={styles.mysteryTitleHeader}>
                  <Text style={[styles.misterioHeaderTitle, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
                    {chapter?.paragraphs?.[0]?.label}
                  </Text>
                </View>
              ) : null}
              {isViaSacra ? (
                <Image
                  source={viaSacraImage}
                  style={styles.viaSacraImage}
                  contentFit="contain"
                />
              ) : (
                <Image
                  source={rosarioImage}
                  style={styles.rosarioImage}
                  contentFit="cover"
                />
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (isViaSacra || isMisteriosTerco) {
            const label = item.label?.trim();

            const isVersiculo = isViaSacra && label === 'Versículo';
            const isResposta = isViaSacra && label === 'Resposta';
            const isContemplacao = isViaSacra && label === 'Contemplação';
            const isOracoes = isViaSacra && label === 'Orações';
            const isCantico = isViaSacra && label === 'Cântico';

            const isMisterioItem = isMisteriosTerco && label;

            return (
              <View style={styles.viaSacraField}>
                {isMisterioItem ? (
                  <>
                    {/* Seção: Meditação ou Oração */}
                    <View style={[styles.mysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.mysterySectionHeader}>
                        <MaterialCommunityIcons 
                          name={
                            fluxo 
                              ? (item.label?.toLowerCase().includes('cruz') ? 'cross' : 'hands-pray') 
                              : 'book-open-variant'
                          } 
                          size={18} 
                          color={colors.primary} 
                        />
                        <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>
                          {fluxo ? item.label : 'Meditação'}
                        </Text>
                      </View>
                      <Text style={[styles.misterioText, { color: colors.text, fontSize: 16, lineHeight: 24 }]}>
                        {item.text}
                      </Text>
                    </View>

                    {isMisteriosTerco && !fluxo && (() => {
                      const mystery = findMysteryByGlobalIndex(currentChapterId - 1);
                      if (!mystery) return null;
                      return (
                        <>
                          {/* Seção: Leitura Bíblica */}
                          {(mystery.leitura_biblica?.referencia || mystery.leitura_biblica?.texto) ? (
                            <View style={[styles.mysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                              <View style={styles.mysterySectionHeader}>
                                <MaterialCommunityIcons name="book-cross" size={18} color={colors.primary} />
                                <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>Leitura Bíblica</Text>
                              </View>
                              {mystery.leitura_biblica?.referencia ? (
                                <Pressable
                                  onPress={() => handleNavigateToBible(mystery.leitura_biblica.referencia)}
                                  style={({ pressed }) => [
                                    styles.mysteryRefBadge,
                                    { backgroundColor: colors.primary + '15' },
                                    pressed && { opacity: 0.7 }
                                  ]}
                                >
                                  <Ionicons name="bookmark" size={14} color={colors.primary} />
                                  <Text numberOfLines={1} style={[styles.mysteryRefText, { color: colors.primary }]}>{mystery.leitura_biblica.referencia}</Text>
                                </Pressable>
                              ) : null}
                              {mystery.leitura_biblica?.texto ? (
                                <Text style={[styles.mysteryReadingText, { color: colors.text }]}>
                                  {mystery.leitura_biblica.texto}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}

                          {/* Seção: Orações (espelhando a oração atual) */}
                          {currentMysteryPrayer ? (
                            <View style={[styles.mysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                              <View style={styles.mysterySectionHeader}>
                                <MaterialCommunityIcons name="hands-pray" size={18} color={colors.primary} />
                                <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>
                                  {currentMysteryPrayer.titulo}
                                </Text>
                              </View>
                              <View style={{ paddingVertical: spacing.xs }}>
                                <Text style={[styles.misterioText, { color: colors.text, fontSize: 16, lineHeight: 24 }]}>
                                  {currentMysteryPrayer.conteudo}
                                </Text>
                              </View>
                            </View>
                          ) : null}
                        </>
                      );
                    })()}
                  </>
                ) : isVersiculo ? (
                  <View style={[styles.mysterySection, styles.viaSacraMysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.mysterySectionHeader, styles.viaSacraSectionHeader]}>
                      <Text style={[styles.viaSacraSymbol, { color: colors.primary }]}>℣</Text>
                      <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>Versículo</Text>
                    </View>
                    <Text style={[styles.viaSacraCardText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </View>
                ) : isResposta ? (
                  <View style={[styles.mysterySection, styles.viaSacraMysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.mysterySectionHeader, styles.viaSacraSectionHeader]}>
                      <Text style={[styles.viaSacraSymbol, { color: colors.primary }]}>℟</Text>
                      <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>Resposta</Text>
                    </View>
                    <Text style={[styles.viaSacraCardText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </View>
                ) : isContemplacao ? (
                  <View style={[styles.mysterySection, styles.viaSacraMysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.mysterySectionHeader, styles.viaSacraSectionHeader]}>
                      <Ionicons name="book" size={18} color={colors.primary} />
                      <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>Contemplação</Text>
                    </View>
                    <Text style={[styles.viaSacraCardText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </View>
                ) : isOracoes ? (() => {
                  const station = getViaSacraStation(currentChapterId);
                  return (
                    <View style={[styles.mysterySection, styles.viaSacraMysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={[styles.mysterySectionHeader, styles.viaSacraSectionHeader]}>
                        <MaterialCommunityIcons name="hands-pray" size={18} color={colors.primary} />
                        <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>Orações</Text>
                      </View>
                      {item.text ? (
                        <View style={[styles.mysteryPrayerRow, { borderBottomColor: colors.divider }]}>
                          <Ionicons name="ellipse" size={6} color={colors.primary} style={{ marginTop: 7 }} />
                          <Text style={[styles.mysteryPrayerTextStyled, { color: colors.text }]}>
                            {item.text}
                          </Text>
                        </View>
                      ) : null}
                      {station?.oracoes_tradicionais ? (
                        <View style={styles.mysteryPrayerRow}>
                          <Ionicons name="ellipse" size={6} color={colors.primary} style={{ marginTop: 7 }} />
                          <Text style={[styles.mysteryPrayerTextStyled, { color: colors.text }]}>
                            {station.oracoes_tradicionais}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })() : isCantico ? (
                  <View style={[styles.mysterySection, styles.viaSacraMysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.mysterySectionHeader, styles.viaSacraSectionHeader]}>
                      <Ionicons name="musical-notes" size={18} color={colors.primary} />
                      <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>Cântico</Text>
                    </View>
                    <Text style={[styles.viaSacraCanticoText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.mysterySection, styles.viaSacraMysterySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.mysterySectionHeader, styles.viaSacraSectionHeader]}>
                      <MaterialCommunityIcons name="hands-pray" size={18} color={colors.primary} />
                      <Text style={[styles.mysterySectionTitle, { color: colors.primary }]}>{label}</Text>
                    </View>
                    <Text style={[styles.viaSacraCardText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </View>
                )}
              </View>
            );
          }

          const selected = selectedParagraphs.includes(item.number);
          const favorito = favoritesSet.has(item.number);
          const isDeepLinkTarget = isDeepLinking && targetParagraphs.includes(item.number);
          const paraCoverages = coveragesByParagraph[item.number] || EMPTY_COVERAGES;

          let pendingStartWord: number | undefined = undefined;
          if (pendingHighlight && pendingHighlight.paragraphNumber === item.number) {
            pendingStartWord = pendingHighlight.wordIndex;
          }

          return (
            <ParagraphItem
              paragraph={item}
              selected={selected}
              favorito={favorito}
              colors={colors}
              onPress={handleParagraphPress}
              onLongPress={handleParagraphLongPress}
              highlightOpacity={isDeepLinkTarget ? highlightOpacity : undefined}
              coverages={paraCoverages}
              isHighlightMode={isHighlightMode && canHighlight}
              isEraseMode={isHighlightMode && canHighlight ? isEraseMode : false}
              selectedColor={isHighlightMode && canHighlight ? selectedHighlightColor : HIGHLIGHT_COLORS[0]}
              isDark={isDark}
              pendingStartWord={pendingStartWord}
              pendingCrossFullCoverage={false}
              onWordTap={handleWordTap}
              onRemoveHighlight={handleRemoveHighlight}
            />
          );
        }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={4}
        onScrollToIndexFailed={(info) => {
          const approximateOffset = info.averageItemLength * info.index;
          flatListRef.current?.scrollToOffset({ offset: approximateOffset, animated: true });

          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
          }, 350);
        }}
      />

      {/* Hidden View for Sharing */}
      <View style={{ position: 'absolute', left: -9999, top: 0, opacity: 0 }} pointerEvents="none">
        <MeditationShareCard
          ref={shareCardRef}
          text={selectedParagraphs.length === 1 ? chapter.paragraphs.find(p => p.number === selectedParagraphs[0])?.text || '' : ''}
          number={selectedParagraphs.length === 1 ? selectedParagraphs[0] : 0}
          chapterNumber={currentChapterId}
          chapterName={chapter.name}
          bookTitle={book.title}
          bookIcon={book.icon}
          bookAuthor={book.author}
          bookColor={book.color}
          date={new Date().toLocaleDateString('pt-BR')}
          hideChapterNumber={isFrasesDeSantos || isMisteriosTerco}
        />
      </View>

      {/* Painel de Cores do Grifo */}
      {isHighlightMode && canHighlight && (
        <HighlightColorPanel
          selectedColor={selectedHighlightColor}
          isEraseMode={isEraseMode}
          onColorSelect={(color) => {
            setSelectedHighlightColor(color);
            setIsEraseMode(false);
          }}
          onEraseToggle={() => setIsEraseMode(prev => !prev)}
          onClose={() => {
            setIsHighlightMode(false);
            setIsEraseMode(false);
          }}
          colors={colors}
        />
      )}
      {/* Botão flutuante para avançar as contas ou mudar de capítulo */}
      {isMisteriosTerco && (fluxo === 'intro' || !fluxo) && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          onPress={async () => {
            const limit = fluxo === 'intro' ? 6 : 12;
            if (beadCount < limit) {
              const nextCount = beadCount + 1;
              setBeadCount(nextCount);
              if (nextCount === limit) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            } else {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleNextChapter();
            }
          }}
        >
          <MaterialCommunityIcons 
            name={beadCount < (fluxo === 'intro' ? 6 : 12) ? "plus" : "chevron-right"} 
            size={28} 
            color="#fff" 
          />
        </Pressable>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    zIndex: 10,
    elevation: 2,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    gap: 4,
    flexShrink: 0,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  chapterIndicator: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.round,
  },
  chapterIndicatorText: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  chapterIndicatorTextViaSacra: {
    ...typography.h4,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
  },
  paragraphContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 2,
  },
  paragraphFavorite: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  paragraphContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  paragraphTextContainer: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  paragraphNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: spacing.md,
    marginTop: 2,
    minWidth: 22,
  },
  paragraphText: {
    ...typography.body,
    lineHeight: 26,
    fontSize: 16,
  },
  favoriteIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  viaSacraHeader: {
    marginBottom: spacing.sm,
  },
  viaSacraImage: {
    width: '100%',
    minHeight: 200,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  rosarioImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  viaSacraField: {
    paddingVertical: 0,
    marginBottom: 0,
  },
  viaSacraFieldLabel: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  viaSacraFieldText: {
    ...typography.body,
    lineHeight: 26,
    fontSize: 16,
  },
  viaSacraInlineLine: {
    ...typography.h4,
    lineHeight: 24,
  },
  viaSacraInlinePrefix: {
    ...typography.h4,
  },
  viaSacraInlineText: {
    ...typography.h4,
  },
  viaSacraTraditionText: {
    ...typography.h4,
    lineHeight: 24,
  },
  misterioLabel: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  misterioText: {
    ...typography.body,
    lineHeight: 28,
    fontSize: 16,
  },
  mysterySection: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  mysterySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mysterySectionTitle: {
    ...typography.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mysteryRefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
  },
  mysteryRefText: {
    ...typography.small,
    fontWeight: '600',
    fontStyle: 'italic',
    flexShrink: 0,
  },
  mysteryReadingText: {
    ...typography.body,
    lineHeight: 28,
    fontSize: 16,
    fontStyle: 'italic',
  },
  mysteryPrayerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  mysteryPrayerTextStyled: {
    ...typography.body,
    flex: 1,
    fontWeight: '600',
    lineHeight: 26,
    fontSize: 15,
  },
  mysteryPrayerText: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  mysteryGroupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  mysteryGroupEmoji: {
    fontSize: 16,
  },
  mysteryGroupText: {
    ...typography.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  groupHeaderTitle: {
    ...typography.h4,
    fontWeight: '700',
    textAlign: 'center',
  },
  mysteryTitleHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  mysteryOrderBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  mysteryOrderText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  misterioHeaderTitle: {
    ...typography.h3,
    fontWeight: '700',
    fontSize: 20,
    textAlign: 'center',
  },
  menuContainerFixed: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  menuTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  menuActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  menuButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  menuButtonText: {
    ...typography.small,
    fontWeight: '600',
    fontSize: 12,
  },
  viaSacraCardText: {
    ...typography.body,
    lineHeight: 28,
    fontSize: 16,
  },
  viaSacraResponsePrefix: {
    fontWeight: '700',
    fontSize: 16,
  },
  viaSacraCanticoText: {
    ...typography.body,
    lineHeight: 26,
    fontSize: 16,
    fontStyle: 'italic',
  },
  viaSacraMysterySection: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  viaSacraSectionHeader: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  viaSacraSymbol: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  highlightPanel: {
    position: 'absolute',
    bottom: 30,
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  highlightHelpText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderWidth: 2,
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeHighlightBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beadsContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  crossIndicatorContainer: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beadsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  beadLarge: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  beadsCountText: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});
