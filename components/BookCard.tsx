import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { BookData } from '@/lib/types';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface BookCardProps {
  book: BookData;
  onPress: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onPress }) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container, 
        shadows.sm, 
        { 
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        }
      ]} 
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceLight }]}>
        <Text style={styles.icon}>{book.icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{book.title}</Text>
        <Text style={[styles.author, { color: colors.textSecondary }]}>{book.author}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
          {book.description}
        </Text>
        <View style={[styles.footer, { borderTopColor: colors.divider }]}>
          <Text style={[styles.chapterCount, { color: colors.textSecondary }]}>
            {book.data.chapters.length}{' '}
            {book.slug === 'frases-de-santos'
              ? 'santos'
              : book.slug === 'via-sacra'
                ? 'estações'
                : book.slug === 'catecismo'
                  ? 'temas'
                  : book.slug === 'misterios-terco'
                    ? 'grupos'
                    : 'capítulos'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  content: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
  },
  author: {
    ...typography.caption,
  },
  description: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterCount: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
