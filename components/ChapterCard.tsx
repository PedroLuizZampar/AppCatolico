import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { Chapter } from '@/lib/types';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ChapterCardProps {
  chapter: Chapter;
  bookColor: string;
  onPress: () => void;
  hideNumberBadge?: boolean;
  hideItemCount?: boolean;
  itemLabelSingular?: string;
  itemLabelPlural?: string;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  bookColor,
  onPress,
  hideNumberBadge,
  hideItemCount,
  itemLabelSingular = 'parágrafo',
  itemLabelPlural = 'parágrafos',
}) => {
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
      {!hideNumberBadge ? (
        <View style={[styles.numberContainer, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.numberText, { color: colors.text }]}>{chapter.chapter}</Text>
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {chapter.name}
        </Text>
        {!hideItemCount ? (
          <Text style={[styles.info, { color: colors.textSecondary }]}>
            {chapter.paragraphs.length} {chapter.paragraphs.length === 1 ? itemLabelSingular : itemLabelPlural}
          </Text>
        ) : null}
      </View>
      <View style={styles.arrow}>
        <Text style={[styles.arrowText, { color: colors.textMuted }]}>→</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  numberContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  numberText: {
    ...typography.h4,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  title: {
    ...typography.body,
    fontWeight: '500',
    flexShrink: 1,
  },
  info: {
    ...typography.small,
  },
  arrow: {
    marginLeft: spacing.sm,
  },
  arrowText: {
    fontSize: 18,
  },
});
