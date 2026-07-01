import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius } from '@/lib/theme/tokens';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  iconName?: keyof typeof Ionicons.mappings | string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Aviso',
  message,
  onRetry,
  iconName = 'alert-circle'
}) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  return (
    <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
      <Ionicons name={iconName as any} size={64} color={colors.textSecondary} style={styles.icon} />
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        {title}
      </Text>
      <Text style={[styles.errorText, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {onRetry && (
        <Pressable 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRetry}
        >
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
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
});
