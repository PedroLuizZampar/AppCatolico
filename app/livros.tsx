import { BookCard } from '@/components/BookCard';
import { BOOKS } from '@/lib/data';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LivrosScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const catecismo = BOOKS.find(b => b.slug === 'catecismo');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Biblioteca',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable 
              style={[styles.iconButton, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}
              onPress={() => router.push('/favoritos')}
            >
              <Ionicons name="heart" size={20} color={colors.text} />
            </Pressable>
          )
        }}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.lg + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header minimalista com layout unificado */}
        <Animated.View 
          entering={FadeIn.duration(600)}
          style={styles.header}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="bookshelf" size={36} color="#795548" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Biblioteca</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Livros e Catecismo</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            Acesse as obras clássicas de espiritualidade de São Josemaria Escrivá e o Catecismo da Igreja Católica.
          </Text>
        </Animated.View>

        <View style={styles.booksSection}>
          <Animated.View entering={FadeIn.duration(600).delay(150)}>
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
                <MaterialCommunityIcons name="book-open-page-variant" size={30} color={colors.primary} />
              </View>
              <View style={styles.collectionContent}>
                <Text style={[styles.collectionTitle, { color: colors.text }]}>Livros de São Josemaria</Text>
                <Text style={[styles.collectionAuthor, { color: colors.textSecondary }]}>Caminho • Sulco • Forja</Text>
                <Text style={[styles.collectionDescription, { color: colors.textMuted }]} numberOfLines={2}>
                  Trilogia clássica de pontos de meditação e vida cristã.
                </Text>
                <View style={[styles.collectionFooter, { borderTopColor: colors.divider }]}>
                  <Text style={[styles.collectionFooterText, { color: colors.textSecondary }]}>3 livros</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {catecismo ? (
            <Animated.View entering={FadeIn.duration(600).delay(200)}>
              <BookCard book={catecismo} onPress={() => router.push(`/livro/${catecismo.slug}`)} />
            </Animated.View>
          ) : null}
        </View>

        <Animated.View 
          entering={FadeIn.duration(600).delay(300)}
          style={[styles.footer, { borderTopColor: colors.divider }]}
        >
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Desenvolvido para a glória de Deus
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
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  booksSection: {
    gap: spacing.lg,
  },
  collectionCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  collectionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionIcon: {
    fontSize: 30,
  },
  collectionContent: {
    flex: 1,
  },
  collectionTitle: {
    ...typography.bodyLarge,
    fontWeight: 'bold',
  },
  collectionAuthor: {
    ...typography.caption,
    marginTop: 2,
  },
  collectionDescription: {
    ...typography.small,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  collectionFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
  },
  collectionFooterText: {
    ...typography.caption,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
  },
});
