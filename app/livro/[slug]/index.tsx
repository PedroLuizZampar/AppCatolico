import { ChapterCard } from '@/components/ChapterCard';
import { HighlightedText } from '@/components/HighlightedText';
import { SearchBar } from '@/components/SearchBar';
import { findCatecismoParagraphByNumber } from '@/lib/catecismo';
import { getBookBySlug } from '@/lib/data';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { normalizeText } from '@/lib/utils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import misteriosRaw from '../../../data/Rosário/Mistérios Terço.json';

const getBookIcon = (slug: string, color: string) => {
  const size = 36;
  switch (slug) {
    case 'caminho':
    case 'sulco':
    case 'forja':
      return <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />;
    case 'catecismo':
      return <MaterialCommunityIcons name="book-cross" size={size} color={color} />;
    case 'frases-de-santos':
      return <MaterialCommunityIcons name="format-quote-close" size={size} color={color} />;
    case 'via-sacra':
      return <MaterialCommunityIcons name="cross" size={size} color={color} />;
    case 'misterios-terco':
      return <MaterialCommunityIcons name="hands-pray" size={size} color={color} />;
    default:
      return <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />;
  }
};

export default function BookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const book = getBookBySlug(slug);

  const isCatecismo = slug === 'catecismo';
  const isFrasesDeSantos = slug === 'frases-de-santos';
  const isViaSacra = slug === 'via-sacra';
  const isMisteriosTerco = slug === 'misterios-terco';
  const isJosemariaBook = slug === 'caminho' || slug === 'sulco' || slug === 'forja';

  const [query, setQuery] = useState('');

  const trimmedQuery = query.trim();
  const isNumericQuery = /^\d+$/.test(trimmedQuery);
  const isNumericCatecismoQuery = isCatecismo && isNumericQuery;
  const isNumericJosemariaQuery = isJosemariaBook && isNumericQuery;



  // Busca por conteúdo dos parágrafos (texto, não numérico)
  const matchingParagraphs = useMemo(() => {
    if (!book) return [];
    if (!trimmedQuery || isNumericQuery) return [];
    if (isMisteriosTerco || isViaSacra) return [];

    const q = normalizeText(trimmedQuery);
    if (q.length < 2) return [];

    const results: { chapterId: number; chapterName: string; number: number; text: string }[] = [];

    for (const ch of book.data.chapters) {
      for (const p of ch.paragraphs) {
        if (normalizeText(p.text).includes(q)) {
          results.push({
            chapterId: ch.chapter,
            chapterName: ch.name,
            number: p.number,
            text: p.text,
          });
          if (results.length >= 30) return results;
        }
      }
    }

    return results;
  }, [book, trimmedQuery, isNumericQuery, isMisteriosTerco, isViaSacra]);

  if (!book) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Livro não encontrado</Text>
      </View>
    );
  }

  const findChapterIdForParagraphInBook = (paragraphNumber: number): number | null => {
    for (const ch of book.data.chapters) {
      if (ch.paragraphs.some(p => p.number === paragraphNumber)) return ch.chapter;
    }
    return null;
  };

  const findParagraphTextInBook = (paragraphNumber: number): string | null => {
    for (const ch of book.data.chapters) {
      const found = ch.paragraphs.find(p => p.number === paragraphNumber);
      if (found) return found.text;
    }
    return null;
  };

  const chaptersToShow = (() => {
    if (!trimmedQuery) return book.data.chapters;

    // Catecismo: texto filtra temas (nome do capítulo)
    if (isCatecismo) {
      if (isNumericCatecismoQuery) return book.data.chapters;
      const q = normalizeText(trimmedQuery);
      return book.data.chapters.filter(ch => normalizeText(ch.name).includes(q));
    }

    // Frases de Santos: texto filtra apenas pelo nome do santo
    if (isFrasesDeSantos) {
      const q = normalizeText(trimmedQuery);
      return book.data.chapters.filter(ch => normalizeText(ch.name).includes(q));
    }

    // Livros do São Josemaria: número vai direto ao ponto; texto filtra pelos temas (nome do capítulo), como no Catecismo
    if (isJosemariaBook) {
      if (isNumericJosemariaQuery) return book.data.chapters;
      const q = normalizeText(trimmedQuery);
      return book.data.chapters.filter(ch => normalizeText(ch.name).includes(q));
    }

    return book.data.chapters;
  })();



  const navigateToCatecismoParagraph = () => {
    if (!isNumericCatecismoQuery) return;

    const n = parseInt(trimmedQuery, 10);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('Número inválido', 'Digite um número de parágrafo válido.');
      return;
    }

    const { text, chapterId } = findCatecismoParagraphByNumber(n);
    if (!text) {
      Alert.alert('Não encontrado', `O parágrafo ${n} não foi encontrado no Catecismo completo.`);
      return;
    }

    if (!chapterId) {
      Alert.alert(
        'Encontrado, mas sem grupo',
        `O parágrafo ${n} existe, mas não foi localizado em nenhum grupo do Catecismo Agrupado.`
      );
      return;
    }

    router.push({
      pathname: '/livro/[slug]/capitulo/[id]',
      params: { slug: 'catecismo', id: chapterId.toString(), paragraph: n.toString() },
    });
  };

  const navigateToJosemariaParagraph = () => {
    if (!isNumericJosemariaQuery) return;

    const n = parseInt(trimmedQuery, 10);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('Número inválido', 'Digite um número de ponto válido.');
      return;
    }

    const text = findParagraphTextInBook(n);
    if (!text) {
      Alert.alert('Não encontrado', `O ponto ${n} não foi encontrado neste livro.`);
      return;
    }

    const chapterId = findChapterIdForParagraphInBook(n);
    if (!chapterId) {
      Alert.alert('Não encontrado', `O ponto ${n} não foi localizado em nenhum capítulo.`);
      return;
    }

    router.push({
      pathname: '/livro/[slug]/capitulo/[id]',
      params: { slug, id: chapterId.toString(), paragraph: n.toString() },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isCatecismo ? 'Catecismo' : book.title,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header minimalista */}
        <Animated.View 
          entering={FadeIn.duration(600).easing(Easing.out(Easing.cubic))}
          style={styles.header}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {getBookIcon(slug, book.color)}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{book.title}</Text>
          <Text style={[styles.author, { color: colors.textSecondary }]}>{book.author}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{book.description}</Text>
        </Animated.View>

        {isCatecismo || isFrasesDeSantos || isJosemariaBook ? (
          <View style={styles.catecismoSearchContainer}>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder={
                    isCatecismo
                      ? 'Busque por tema, conteúdo ou nº...'
                      : isFrasesDeSantos
                        ? 'Buscar santo...'
                        : 'Busque por tema, conteúdo ou nº...'
                  }
                  returnKeyType={(isCatecismo && isNumericCatecismoQuery) || (isJosemariaBook && isNumericJosemariaQuery) ? 'search' : 'done'}
                  onSubmitEditing={() => {
                    if (isCatecismo) {
                      navigateToCatecismoParagraph();
                      return;
                    }
                    if (isJosemariaBook) {
                      navigateToJosemariaParagraph();
                    }
                  }}
                />
              </View>

              {isCatecismo && isNumericCatecismoQuery ? (
                <Pressable
                  style={[styles.goButton, { backgroundColor: colors.primary }]}
                  onPress={navigateToCatecismoParagraph}
                >
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              ) : null}

              {isJosemariaBook && isNumericJosemariaQuery ? (
                <Pressable
                  style={[styles.goButton, { backgroundColor: colors.primary }]}
                  onPress={navigateToJosemariaParagraph}
                >
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              ) : null}
            </View>

            {isCatecismo ? (
              <Text style={[styles.catecismoHint, { color: colors.textMuted }]}>
                Dica: números levam ao parágrafo. Texto filtra temas e busca no conteúdo.
              </Text>
            ) : isFrasesDeSantos ? (
              <Text style={[styles.catecismoHint, { color: colors.textMuted }]}>
                Dica: a busca considera apenas o nome do santo.
              </Text>
            ) : (
              <Text style={[styles.catecismoHint, { color: colors.textMuted }]}>
                Dica: números levam ao ponto. Texto filtra temas e busca no conteúdo.
              </Text>
            )}
          </View>
        ) : null}

        {/* Lista de capítulos */}
        <View style={styles.chaptersSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isViaSacra 
              ? 'Estações' 
              : isCatecismo 
                ? 'Temas' 
                : isFrasesDeSantos 
                  ? 'Santos'
                  : isMisteriosTerco
                    ? 'Mistérios'
                    : 'Capítulos'}
          </Text>
          {isMisteriosTerco ? (
            // Mostrar apenas botões por grupo de mistérios (não listar cada mistério)
            (misteriosRaw as any[]).map((grupo, gIndex) => {
              const chapterIdStart = (misteriosRaw as any[]).slice(0, gIndex).reduce((acc, gg) => acc + (gg.misterios?.length || 0), 0) + 1;
              return (
                <Animated.View key={grupo.grupo} entering={FadeInDown.duration(400).delay(100 + gIndex * 30)}>
                  <Pressable
                    style={[styles.groupItem, { borderRadius: borderRadius.md, backgroundColor: colors.surface }]}
                    onPress={() => router.push(`/livro/${slug}/capitulo/${chapterIdStart}`)}
                  >
                    <View style={styles.groupItemContent}>
                      <Text style={[styles.groupItemTitle, { color: colors.text }]}>{grupo.grupo}</Text>
                      <Text style={[styles.groupItemSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>{grupo.dias?.join(', ') ?? ''}</Text>
                    </View>
                    <Text style={[styles.groupItemArrow, { color: colors.textMuted }]}>→</Text>
                  </Pressable>
                </Animated.View>
              );
            })
          ) : (
            chaptersToShow.map((chapter, index) => (
              <Animated.View
                key={chapter.chapter}
                entering={FadeInDown.duration(500).delay(150 + index * 40).easing(Easing.out(Easing.ease))}
              >
                <ChapterCard
                  chapter={chapter}
                  bookColor={book.color}
                  hideNumberBadge={isFrasesDeSantos || isMisteriosTerco}
                  hideItemCount={isViaSacra || isMisteriosTerco}
                  itemLabelSingular={isFrasesDeSantos ? 'frase' : isMisteriosTerco ? 'mistério' : 'parágrafo'}
                  itemLabelPlural={isFrasesDeSantos ? 'frases' : isMisteriosTerco ? 'mistérios' : 'parágrafos'}
                  onPress={() => router.push(`/livro/${slug}/capitulo/${chapter.chapter}`)}
                />
              </Animated.View>
            ))
          )}

          {/* Resultados de busca por conteúdo */}
          {matchingParagraphs.length > 0 && (
            <View style={styles.contentResultsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isFrasesDeSantos ? 'Frases encontradas' : 'Parágrafos encontrados'}
              </Text>
              <Text style={[styles.contentResultsCount, { color: colors.textMuted }]}>
                {matchingParagraphs.length}{matchingParagraphs.length >= 30 ? '+' : ''} resultado{matchingParagraphs.length !== 1 ? 's' : ''}
              </Text>
              {matchingParagraphs.map((item, index) => (
                <Animated.View
                  key={`${item.chapterId}-${item.number}`}
                  entering={FadeInDown.duration(400).delay(100 + index * 30)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.contentResultItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: '/livro/[slug]/capitulo/[id]',
                        params: { slug, id: item.chapterId.toString(), paragraph: item.number.toString() },
                      })
                    }
                  >
                    <View style={styles.contentResultHeader}>
                      <View style={[styles.contentResultBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.contentResultBadgeText, { color: colors.primary }]}>
                          {isFrasesDeSantos ? '' : `§ ${item.number}`}
                        </Text>
                      </View>
                      <Text style={[styles.contentResultChapter, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.chapterName}
                      </Text>
                    </View>
                    <HighlightedText
                      text={item.text}
                      highlight={trimmedQuery}
                      style={{ ...typography.small, color: colors.textSecondary }}
                      highlightStyle={{ color: colors.primary, fontWeight: '700' }}
                      numberOfLines={3}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.h3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  author: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 16,
  },
  statText: {
    ...typography.small,
  },
  chaptersSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  catecismoSearchContainer: {
    marginBottom: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  goButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catecismoHint: {
    ...typography.small,
  },
  groupTitle: {
    ...typography.h4,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  groupItemContent: {
    flex: 1,
  },
  groupItemTitle: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  groupItemSubtitle: {
    ...typography.small,
  },
  groupItemArrow: {
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  contentResultsSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  contentResultsCount: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  contentResultItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  contentResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  contentResultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  contentResultBadgeText: {
    ...typography.small,
    fontWeight: '700',
  },
  contentResultChapter: {
    ...typography.small,
    flex: 1,
  },
});
