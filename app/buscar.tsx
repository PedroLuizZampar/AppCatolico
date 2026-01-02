import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { searchInBooks } from '@/lib/data';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius, shadows } from '@/lib/theme/tokens';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();
  
  const results = searchInBooks(query);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <SearchBar 
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar em todos os livros..."
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.xl + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {query.length === 0 ? (
          <Animated.View 
            entering={FadeInDown.duration(400)}
            style={styles.emptyState}
          >
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Buscar reflexões</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Digite algo para buscar em todos os livros de São Josemaria Escrivá
            </Text>
          </Animated.View>
        ) : results.length === 0 ? (
          <Animated.View 
            entering={FadeInDown.duration(400)}
            style={styles.emptyState}
          >
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum resultado</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Tente buscar com outras palavras
            </Text>
          </Animated.View>
        ) : (
          <>
            <Animated.Text 
              entering={FadeInDown.duration(300)}
              style={[styles.resultsCount, { color: colors.textSecondary }]}
            >
              {results.length} {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
            </Animated.Text>
            {results.map((result, index) => (
              <Animated.View
                key={`${result.book.slug}-${result.chapter}-${result.paragraph}-${index}`}
                entering={FadeInDown.duration(300).delay(index * 50)}
              >
                <Pressable
                  style={[styles.resultCard, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push(`/livro/${result.book.slug}/capitulo/${result.chapter}`)}
                >
                  <View style={styles.resultHeader}>
                    <Text style={[styles.resultBook, { color: colors.text }]}>{result.book.title}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                      <Text style={[styles.badgeText, { color: colors.textSecondary }]}>#{result.paragraph}</Text>
                    </View>
                  </View>
                  <Text style={[styles.resultChapter, { color: colors.textMuted }]}>
                    Cap. {result.chapter}: {result.chapterName}
                  </Text>
                  <Text style={[styles.resultText, { color: colors.textSecondary }]} numberOfLines={3}>
                    {result.text}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 250,
  },
  resultsCount: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  resultCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  resultBook: {
    ...typography.body,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  badgeText: {
    ...typography.small,
    fontWeight: '600',
  },
  resultChapter: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  resultText: {
    ...typography.body,
  },
});
