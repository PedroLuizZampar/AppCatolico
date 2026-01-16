import { ChapterCard } from '@/components/ChapterCard';
import { SearchBar } from '@/components/SearchBar';
import { findCatecismoParagraphByNumber } from '@/lib/catecismo';
import { getBookBySlug } from '@/lib/data';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

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

  const normalizeText = (value: string): string => {
    return (value ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  const totalParagraphs = useMemo(() => {
    if (!book) return 0;
    return book.data.chapters.reduce((acc, ch) => acc + ch.paragraphs.length, 0);
  }, [book]);

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

  const statsLabelChapters = isViaSacra 
    ? 'estações' 
    : isCatecismo 
      ? 'temas' 
      : isFrasesDeSantos 
        ? 'santos'
        : isMisteriosTerco
          ? 'mistérios'
          : 'capítulos';
  const statsLabelParagraphs = isFrasesDeSantos ? 'frases' : isMisteriosTerco ? 'mistérios' : 'parágrafos';

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
            <Text style={styles.icon}>{book.icon}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{book.title}</Text>
          <Text style={[styles.author, { color: colors.textSecondary }]}>{book.author}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{book.description}</Text>
          
          <View style={[styles.stats, { borderTopColor: colors.divider }]}>
            <View style={styles.statItem}>
              <Ionicons name="book-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {book.data.chapters.length} {statsLabelChapters}
              </Text>
            </View>
            {!isViaSacra && !isMisteriosTerco ? (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
                <View style={styles.statItem}>
                  <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {totalParagraphs} {statsLabelParagraphs}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
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
                      ? 'Busque por tema ou parágrafo...'
                      : isFrasesDeSantos
                        ? 'Buscar santo...'
                        : 'Busque por palavra ou número...'
                  }
                  keyboardType={isNumericQuery ? 'number-pad' : 'default'}
                  inputMode={isNumericQuery ? 'numeric' : 'text'}
                  returnKeyType={(isCatecismo && isNumericCatecismoQuery) || (isJosemariaBook && isNumericJosemariaQuery) ? 'search' : 'done'}
                  onSubmitEditing={() => {
                    if (isCatecismo) {
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
                      return;
                    }

                    if (isJosemariaBook) {
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
                    }
                  }}
                />
              </View>

              {isCatecismo && isNumericCatecismoQuery ? (
                <Pressable
                  style={[styles.goButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
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
                  }}
                >
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              ) : null}

              {isJosemariaBook && isNumericJosemariaQuery ? (
                <Pressable
                  style={[styles.goButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
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
                  }}
                >
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              ) : null}
            </View>

            {isCatecismo ? (
              <Text style={[styles.catecismoHint, { color: colors.textMuted }]}>
                Dica: números levam ao parágrafo (destacado). Texto filtra os temas.
              </Text>
            ) : isFrasesDeSantos ? (
              <Text style={[styles.catecismoHint, { color: colors.textMuted }]}>
                Dica: a busca considera apenas o nome do santo.
              </Text>
            ) : (
              <Text style={[styles.catecismoHint, { color: colors.textMuted }]}>
                Dica: números levam ao ponto (destacado). Texto filtra os temas.
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
          {chaptersToShow.map((chapter, index) => (
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
          ))}
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
});
