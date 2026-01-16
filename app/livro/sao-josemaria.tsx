import { BookCard } from '@/components/BookCard';
import { BOOKS } from '@/lib/data';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography } from '@/lib/theme/tokens';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const JOSEMARIA_SLUGS = new Set(['caminho', 'sulco', 'forja']);

export default function SaoJosemariaScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const books = BOOKS.filter(b => JOSEMARIA_SLUGS.has(b.slug));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.lg + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.booksSection}>
          {books.map((book, index) => (
            <Animated.View key={book.id} entering={FadeInDown.duration(350).delay(140 + index * 90)}>
              <BookCard book={book} onPress={() => router.push(`/livro/${book.slug}`)} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
  },
  booksSection: {
    gap: spacing.md,
  },
});
