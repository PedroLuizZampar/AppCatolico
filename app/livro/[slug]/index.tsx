import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ChapterCard } from '@/components/ChapterCard';
import { SearchBar } from '@/components/SearchBar';
import { getBookBySlug } from '@/lib/data';
import { findCatecismoParagraphByNumber } from '@/lib/catecismo';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius } from '@/lib/theme/tokens';

export default function BookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const book = getBookBySlug(slug);

  const isCatecismo = slug === 'catecismo';
  const [catecismoQuery, setCatecismoQuery] = useState('');

  const trimmedCatecismoQuery = catecismoQuery.trim();
  const isNumericCatecismoQuery = isCatecismo && /^\d+$/.test(trimmedCatecismoQuery);

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

  const chaptersToShow = (() => {
    if (!isCatecismo) return book.data.chapters;
    if (!trimmedCatecismoQuery) return book.data.chapters;
    if (isNumericCatecismoQuery) return book.data.chapters;

    const q = trimmedCatecismoQuery.toLowerCase();
    return book.data.chapters.filter(ch => ch.name.toLowerCase().includes(q));
  })();

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
                {book.data.chapters.length} capítulos
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {totalParagraphs} parágrafos
              </Text>
            </View>
          </View>
        </Animated.View>

        {isCatecismo ? (
          <View style={styles.catecismoSearchContainer}>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <SearchBar
                  value={catecismoQuery}
                  onChangeText={setCatecismoQuery}
                  placeholder="Busque por tema ou parágrafo..."
                  keyboardType={isNumericCatecismoQuery ? 'number-pad' : 'default'}
                  inputMode={isNumericCatecismoQuery ? 'numeric' : 'text'}
                  returnKeyType={isNumericCatecismoQuery ? 'search' : 'done'}
                  onSubmitEditing={() => {
                    if (!isNumericCatecismoQuery) return;

                    const n = parseInt(trimmedCatecismoQuery, 10);
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
                />
              </View>

              {isNumericCatecismoQuery ? (
                <Pressable
                  style={[styles.goButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const n = parseInt(trimmedCatecismoQuery, 10);
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
            </View>

            <Text style={[styles.catecismoHint, { color: colors.textMuted }]}>
              Dica: números levam ao parágrafo (destacado). Texto filtra os temas.
            </Text>
          </View>
        ) : null}

        {/* Lista de capítulos */}
        <View style={styles.chaptersSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Capítulos</Text>
          {chaptersToShow.map((chapter, index) => (
            <Animated.View
              key={chapter.chapter}
              entering={FadeInDown.duration(500).delay(150 + index * 40).easing(Easing.out(Easing.ease))}
            >
              <ChapterCard
                chapter={chapter}
                bookColor={book.color}
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
