import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius, shadows } from '@/lib/theme/tokens';
import { getLivroBiblicoBySlug } from '@/lib/bibliaData';
import { useSafeNavigation } from '../../../lib/hooks/useSafeNavigation'; // Importe o novo hook

export default function LivroBibliaScreen() {
  const { livro: livroSlug } = useLocalSearchParams<{ livro: string }>();
  const navigation = useSafeNavigation(); 
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const livro = getLivroBiblicoBySlug(livroSlug);

  if (!livro) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Livro não encontrado
        </Text>
      </View>
    );
  }

  const handleCapituloPress = (capitulo: number) => {
    navigation.push(`/biblia/${livroSlug}/capitulo/${capitulo}` as any);
  };

  const totalVersiculos = livro.capitulos.reduce(
    (sum, cap) => sum + cap.versiculos.length,
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header do livro */}
        <Animated.View
          entering={FadeIn.duration(600).easing(Easing.out(Easing.cubic))}
          style={styles.header}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceLight }]}>
            <Text style={styles.icon}>📖</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{livro.nome}</Text>
          <Text style={[styles.testament, { color: colors.textSecondary }]}>
            {livro.testamento} Testamento
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Ionicons name="book-outline" size={16} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {livro.capitulos.length} capítulos
              </Text>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="list-outline" size={16} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {totalVersiculos} versículos
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        </Animated.View>

        {/* Grid de capítulos */}
        <View style={styles.capitulosGrid}>
          {livro.capitulos.map((capitulo, index) => (
            <Animated.View
              key={capitulo.capitulo}
              entering={FadeInDown.duration(500)
                .delay(150 + index * 20)
                .easing(Easing.out(Easing.ease))}
              style={[
                styles.capituloWrapper,
                (index + 1) % 4 === 0 && styles.capituloWrapperLast
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.capituloCard,
                  shadows.sm,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleCapituloPress(capitulo.capitulo)}
              >
                <Text style={[styles.capituloNumber, { color: colors.primary }]}>
                  {capitulo.capitulo}
                </Text>
                <Text style={[styles.capituloInfo, { color: colors.textMuted }]}>
                  {capitulo.versiculos.length} versículos
                </Text>
              </Pressable>
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
    paddingBottom: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  testament: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.small,
  },
  divider: {
    width: 60,
    height: 3,
    borderRadius: 2,
    marginTop: spacing.md,
  },
  capitulosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  capituloWrapper: {
    width: '23.5%',
    marginRight: '2%',
    marginBottom: spacing.md,
  },
  capituloWrapperLast: {
    marginRight: 0,
  },
  capituloCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  capituloNumber: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  capituloInfo: {
    ...typography.small,
    fontSize: 8,
  },
});
