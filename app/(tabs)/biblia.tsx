import { HighlightedText } from '@/components/HighlightedText';
import { biblia, todosLivros } from '@/lib/bibliaData';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { LivroBiblico } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const normalizeText = (value: string): string =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function BibliaScreen() {
  const [selectedTestament, setSelectedTestament] = useState<'Antigo' | 'Novo'>('Antigo');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const livros = selectedTestament === 'Antigo' ? biblia.antigoTestamento : biblia.novoTestamento;

  const trimmedQuery = searchQuery.trim();

  const filteredLivros = trimmedQuery
    ? livros.filter(livro =>
        normalizeText(livro.nome).includes(normalizeText(trimmedQuery))
      )
    : livros;

  // Busca por conteúdo dos versículos (ambos os testamentos)
  const matchingVerses = useMemo(() => {
    if (!trimmedQuery || trimmedQuery.length < 2) return [];

    const q = normalizeText(trimmedQuery);
    const results: {
      livroNome: string;
      livroSlug: string;
      capitulo: number;
      versiculo: number;
      texto: string;
    }[] = [];

    for (const livro of todosLivros) {
      for (const cap of livro.capitulos) {
        for (const v of cap.versiculos) {
          if (normalizeText(v.texto).includes(q)) {
            results.push({
              livroNome: livro.nome,
              livroSlug: livro.slug,
              capitulo: cap.capitulo,
              versiculo: v.versiculo,
              texto: v.texto,
            });
            if (results.length >= 30) return results;
          }
        }
      }
    }

    return results;
  }, [trimmedQuery]);

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
            placeholder="Buscar livro ou versículo..."
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

      {/* Resultados de busca por conteúdo */}
      {matchingVerses.length > 0 && (
        <View style={styles.verseResultsSection}>
          <Text style={[styles.verseResultsTitle, { color: colors.text }]}>
            Versículos encontrados
          </Text>
          <Text style={[styles.verseResultsCount, { color: colors.textMuted }]}>
            {matchingVerses.length}{matchingVerses.length >= 30 ? '+' : ''} resultado{matchingVerses.length !== 1 ? 's' : ''}
          </Text>
          {matchingVerses.map((item, index) => (
            <Animated.View
              key={`${item.livroSlug}-${item.capitulo}-${item.versiculo}`}
              entering={FadeInDown.duration(400).delay(100 + index * 30)}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.verseResultItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/biblia/[livro]/capitulo/[id]',
                    params: {
                      livro: item.livroSlug,
                      id: item.capitulo.toString(),
                      paragraph: item.versiculo.toString(),
                    },
                  } as any)
                }
              >
                <View style={styles.verseResultHeader}>
                  <View style={[styles.verseResultBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.verseResultBadgeText, { color: colors.primary }]}>
                      {item.livroNome} {item.capitulo},{item.versiculo}
                    </Text>
                  </View>
                </View>
                <HighlightedText
                  text={item.texto}
                  highlight={trimmedQuery}
                  style={{ ...typography.small, color: colors.textSecondary }}
                  highlightStyle={{ color: colors.primary, fontWeight: '700' }}
                  numberOfLines={3}
                />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
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
    width: '48%',
  },
  bookItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
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
  verseResultsSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  verseResultsTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  verseResultsCount: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  verseResultItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  verseResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  verseResultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  verseResultBadgeText: {
    ...typography.small,
    fontWeight: '700',
  },
});
