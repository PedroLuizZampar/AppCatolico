import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius, shadows } from '@/lib/theme/tokens';
import { biblia } from '@/lib/bibliaData';
import { LivroBiblico } from '@/lib/types';

export default function BibliaScreen() {
  const [selectedTestament, setSelectedTestament] = useState<'Antigo' | 'Novo'>('Antigo');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const livros = selectedTestament === 'Antigo' ? biblia.antigoTestamento : biblia.novoTestamento;

  const filteredLivros = searchQuery
    ? livros.filter(livro =>
        livro.nome.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : livros;

  const handleLivroPress = (livro: LivroBiblico) => {
    router.push(`/biblia/${livro.slug}` as any);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContainer,
        { paddingBottom: spacing.sm + insets.bottom }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header simplificado */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.header, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>📖 Bíblia Sagrada</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ave Maria</Text>
      </Animated.View>

      {/* Busca compacta */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={styles.searchContainer}
      >
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar livro..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Seletor de Testamento */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(200)}
        style={styles.testamentSelector}
      >
        <Pressable
          style={[
            styles.testamentButton,
            selectedTestament === 'Antigo' && { backgroundColor: colors.primary },
            { borderColor: colors.border },
          ]}
          onPress={() => setSelectedTestament('Antigo')}
        >
          <Text
            style={[
              styles.testamentText,
              { color: selectedTestament === 'Antigo' ? '#fff' : colors.textSecondary },
            ]}
          >
            Antigo Testamento
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.testamentButton,
            selectedTestament === 'Novo' && { backgroundColor: colors.primary },
            { borderColor: colors.border },
          ]}
          onPress={() => setSelectedTestament('Novo')}
        >
          <Text
            style={[
              styles.testamentText,
              { color: selectedTestament === 'Novo' ? '#fff' : colors.textSecondary },
            ]}
          >
            Novo Testamento
          </Text>
        </Pressable>
      </Animated.View>

      {/* Lista de Livros */}
      <View style={styles.booksGrid}>
        {filteredLivros.map((livro, index) => (
          <Animated.View
            key={livro.slug}
            entering={FadeInDown.duration(400).delay(300 + (index * 20))}
            style={styles.bookItemContainer}
          >
            <Pressable
              style={({ pressed }) => [
                styles.bookItem,
                shadows.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => handleLivroPress(livro)}
            >
              <Text style={[styles.bookName, { color: colors.text }]}>{livro.nome}</Text>
              <Text style={[styles.chapterCount, { color: colors.textMuted }]}>
                {livro.capitulos.length} capítulos
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.md,
  },
  header: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
  },
  testamentSelector: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  testamentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  testamentText: {
    ...typography.small,
    fontWeight: '600',
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookItemContainer: {
    width: '48%', // Aproximadamente metade da largura menos o gap
  },
  bookItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100, // Altura fixa para uniformizar
  },
  bookName: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  chapterCount: {
    ...typography.small,
  },
});
