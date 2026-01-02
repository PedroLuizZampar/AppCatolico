import { BookCard } from '@/components/BookCard';
import { BOOKS } from '@/lib/data';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const catecismo = BOOKS.find(b => b.slug === 'catecismo');
  const viaSacra = BOOKS.find(b => b.slug === 'via-sacra');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.sm + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header minimalista */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.header}
        >
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Biblioteca</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>São Josemaria Escrivá</Text>
          </View>
          <Pressable 
            style={[styles.iconButton, { 
              backgroundColor: colors.surface,
              borderColor: colors.border 
            }]}
            onPress={() => router.push('/favoritos')}
          >
            <Ionicons name="heart-outline" size={20} color={colors.text} />
          </Pressable>
        </Animated.View>

        {/* Card de Meditação Rápida */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <Pressable
            style={({ pressed }) => [
              styles.meditationCard,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            onPress={() => router.push('/meditacao')}
          >
            <View style={styles.meditationContent}>
              <View style={styles.meditationIcon}>
                <Text style={styles.meditationEmoji}>🙏</Text>
              </View>
              <View style={styles.meditationText}>
                <Text style={styles.meditationTitle}>Meditação Rápida</Text>
                <Text style={styles.meditationSubtitle}>
                  Um parágrafo inspirador para sua reflexão diária
                </Text>
              </View>
              <View style={styles.meditationArrow}>
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {/* Lista de livros */}
        <View style={styles.booksSection}>
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Pressable
              style={({ pressed }) => [
                styles.collectionCard,
                shadows.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => router.push('/livro/sao-josemaria')}
            >
              <View style={[styles.collectionIconContainer, { backgroundColor: colors.surfaceLight }]}>
                <Text style={styles.collectionIcon}>📚</Text>
              </View>
              <View style={styles.collectionContent}
              >
                <Text style={[styles.collectionTitle, { color: colors.text }]}>Livros de São Josemaria</Text>
                <Text style={[styles.collectionAuthor, { color: colors.textSecondary }]}>Caminho • Sulco • Forja</Text>
                <Text style={[styles.collectionDescription, { color: colors.textMuted }]} numberOfLines={2}>
                  Trilogia clássica de pontos de meditação e vida cristã.
                </Text>
                <View style={[styles.collectionFooter, { borderTopColor: colors.divider }]}
                >
                  <Text style={[styles.collectionFooterText, { color: colors.textSecondary }]}>3 livros</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {catecismo ? (
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <BookCard book={catecismo} onPress={() => router.push(`/livro/${catecismo.slug}`)} />
            </Animated.View>
          ) : null}

          {viaSacra ? (
            <Animated.View entering={FadeInDown.duration(400).delay(350)}>
              <BookCard book={viaSacra} onPress={() => router.push(`/livro/${viaSacra.slug}`)} />
            </Animated.View>
          ) : null}
        </View>

        {/* Footer minimalista */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(600)}
          style={[styles.footer, { borderTopColor: colors.divider }]}
        >
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Desenvolvido com ❤️ para a glória de Deus
          </Text>
        </Animated.View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  title: {
    ...typography.h1,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  meditationCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  meditationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  meditationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  meditationEmoji: {
    fontSize: 24,
  },
  meditationText: {
    flex: 1,
  },
  meditationTitle: {
    ...typography.h3,
    color: '#fff',
    marginBottom: 4,
  },
  meditationSubtitle: {
    ...typography.small,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  meditationArrow: {
    opacity: 0.8,
  },
  booksSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  collectionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  collectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionIcon: {
    fontSize: 32,
  },
  collectionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  collectionTitle: {
    ...typography.h3,
  },
  collectionAuthor: {
    ...typography.caption,
  },
  collectionDescription: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  collectionFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collectionFooterText: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    ...typography.small,
    opacity: 0.6,
  },
});
