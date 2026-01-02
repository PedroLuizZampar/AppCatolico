import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, borderRadius, typography, shadows } from '@/lib/theme/tokens';
import { Paragraph } from '@/lib/types';

interface ParagraphItemProps {
  paragraph: Paragraph;
  bookColor: string;
  isFavorite?: boolean;
  onPress?: () => void;
  onFavoriteToggle?: () => void;
}

export const ParagraphItem: React.FC<ParagraphItemProps> = ({ 
  paragraph, 
  bookColor,
  isFavorite = false,
  onPress,
  onFavoriteToggle 
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
          opacity: pressed ? 0.9 : 1,
        }
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={[styles.numberBadge, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Text style={[styles.numberText, { color: colors.textSecondary }]}>{paragraph.number}</Text>
        </View>
        {onFavoriteToggle && (
          <Pressable 
            style={styles.favoriteButton}
            onPress={onFavoriteToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.text, { color: colors.text }]}>{paragraph.text}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  numberBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  numberText: {
    ...typography.small,
    fontWeight: '500',
  },
  favoriteButton: {
    padding: spacing.xs,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  text: {
    ...typography.bodyLarge,
    lineHeight: 28,
  },
});
