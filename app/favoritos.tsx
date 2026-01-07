import { getCatecismoChapterIdForParagraph } from '@/lib/catecismo';
import { useFavoritesSync } from '@/lib/hooks/useFavoritesSync';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { FavoriteParagraph } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterType = 'todos' | 'biblia' | 'livro' | 'catecismo' | 'frases';
type SortType = 'recente' | 'antigo' | 'livro' | 'capitulo';

// Tipo estendido para grupos
type FavoriteWithGroup = FavoriteParagraph & {
  isGroup?: boolean;
  groupItems?: FavoriteParagraph[];
};

const formatParagraphRange = (items: FavoriteParagraph[]): string => {
  if (!items || items.length === 0) return '';
  
  const numbers = items.map(i => i.paragraphNumber).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = numbers[0];
  let end = numbers[0];

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] === end + 1) {
      end = numbers[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = numbers[i];
      end = numbers[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  
  return ranges.join(', ');
};

export default function FavoritesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();
  const { favorites, loading, removeFavorite: removeFromSync, clearAll, cleanDuplicates } = useFavoritesSync();

  const [filterType, setFilterType] = useState<FilterType>('todos');
  const [sortType, setSortType] = useState<SortType>('recente');

  // Limpar duplicatas ao carregar
  React.useEffect(() => {
    const checkAndCleanDuplicates = async () => {
      try {
        const removed = await cleanDuplicates();
        if (removed > 0) {
          console.log(`✅ ${removed} duplicata(s) removida(s) automaticamente`);
        }
      } catch (error) {
        console.error('Erro ao limpar duplicatas:', error);
      }
    };
    
    checkAndCleanDuplicates();
  }, []);

  // Filtrar, agrupar e ordenar favoritos
  const processedFavorites: FavoriteWithGroup[] = useMemo(() => {
    let filtered = [...favorites];

    // Aplicar filtro por tipo
    if (filterType === 'biblia') {
      filtered = filtered.filter(f => f.type === 'biblia');
    } else if (filterType === 'livro') {
      filtered = filtered.filter(f => f.type === 'livro' && f.bookSlug !== 'catecismo');
    } else if (filterType === 'catecismo') {
      filtered = filtered.filter(f => f.bookSlug === 'catecismo');
    } else if (filterType === 'frases') {
      filtered = filtered.filter(f => f.type === 'frases');
    }

    // Aplicar ordenação
    switch (sortType) {
      case 'recente':
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'antigo':
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'livro':
        filtered.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
        break;
      case 'capitulo':
        filtered.sort((a, b) => {
          if (a.bookSlug === b.bookSlug) {
            return a.chapterId - b.chapterId;
          }
          return a.bookTitle.localeCompare(b.bookTitle);
        });
        break;
    }

    // Agrupar favoritos com groupId
    const grouped: FavoriteWithGroup[] = [];
    const processedGroupIds = new Set<string>();

    for (const fav of filtered) {
      if (fav.groupId && !processedGroupIds.has(fav.groupId)) {
        // Encontrar todos os itens do grupo
        const groupItems = filtered.filter(f => f.groupId === fav.groupId);
        
        if (groupItems.length > 1) {
          // Criar um representante do grupo
          const groupRep = {
            ...groupItems[0],
            isGroup: true,
            groupItems,
          };
          grouped.push(groupRep);
          processedGroupIds.add(fav.groupId);
        } else {
          // Apenas um item, adicionar normalmente
          grouped.push(fav);
        }
      } else if (!fav.groupId) {
        grouped.push(fav);
      }
    }

    return grouped;
  }, [favorites, filterType, sortType]);

  const handleRemove = (favorite: FavoriteParagraph) => {
    Alert.alert(
      'Remover Favorito',
      'Tem certeza que deseja remover este item dos favoritos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            await removeFromSync(favorite);
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Limpar Tudo',
      'Tem certeza que deseja remover todos os favoritos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpar', 
          style: 'destructive',
          onPress: async () => {
            await clearAll();
          }
        }
      ]
    );
  };

  const handlePress = (favorite: FavoriteWithGroup) => {
    const paragraphParam = favorite.isGroup && favorite.groupItems
      ? favorite.groupItems
          .map(i => i.paragraphNumber)
          .sort((a, b) => a - b)
          .join(',')
      : favorite.paragraphNumber.toString();

    const firstParagraphNumber = favorite.isGroup && favorite.groupItems
      ? [...favorite.groupItems]
          .map(i => i.paragraphNumber)
          .sort((a, b) => a - b)[0]
      : favorite.paragraphNumber;

    const resolvedChapterId = favorite.bookSlug === 'catecismo'
      ? (getCatecismoChapterIdForParagraph(firstParagraphNumber) ?? favorite.chapterId)
      : favorite.chapterId;

    if (favorite.type === 'biblia') {
      router.push({
        pathname: '/biblia/[livro]/capitulo/[id]',
        params: { 
          livro: favorite.bookSlug, 
          id: favorite.chapterId.toString(),
          paragraph: paragraphParam
        }
      });
    } else {
      router.push({
        pathname: '/livro/[slug]/capitulo/[id]',
        params: { 
          slug: favorite.bookSlug, 
          id: resolvedChapterId.toString(),
          paragraph: paragraphParam
        }
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          title: 'Favoritos',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            favorites.length > 0 ? (
              <Pressable onPress={handleClearAll} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            ) : null
          ),
        }} 
      />

      {/* Filtros */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <ScrollView  
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filtersContainer}
        >
          <Pressable
            style={[
              styles.filterChip,
              filterType === 'todos' && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setFilterType('todos')}
          >
            <Text style={[
              styles.filterText,
              { color: filterType === 'todos' ? '#fff' : colors.text }
            ]}>Todos</Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              filterType === 'biblia' && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setFilterType('biblia')}
          >
            <Text style={[
              styles.filterText,
              { color: filterType === 'biblia' ? '#fff' : colors.text }
            ]}>Bíblia</Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              filterType === 'livro' && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setFilterType('livro')}
          >
            <Text style={[
              styles.filterText,
              { color: filterType === 'livro' ? '#fff' : colors.text }
            ]}>Livros</Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filterType === 'catecismo' && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setFilterType('catecismo')}
          >
            <Text style={[
              styles.filterText,
              { color: filterType === 'catecismo' ? '#fff' : colors.text }
            ]}>Catecismo</Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              filterType === 'frases' && { backgroundColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setFilterType('frases')}
          >
            <Text style={[
              styles.filterText,
              { color: filterType === 'frases' ? '#fff' : colors.text }
            ]}>Frases</Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.xl + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : processedFavorites.length === 0 ? (
          <Animated.View 
            entering={FadeInDown.duration(400)}
            style={styles.emptyState}
          >
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum favorito</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Seus trechos favoritos aparecerão aqui
            </Text>
          </Animated.View>
        ) : (
          processedFavorites.map((fav, index) => (
            <Animated.View
              key={`${fav.bookSlug}-${fav.chapterId}-${fav.paragraphNumber}-${index}`}
              entering={FadeInDown.duration(300).delay(index * 50)}
            >
              <Pressable
                style={[styles.card, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handlePress(fav)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.bookInfo}>
                    <Text style={[styles.bookTitle, { color: colors.primary }]}>
                      {fav.bookTitle}
                    </Text>
                    {fav.bookSlug !== 'catecismo' ? (
                      <Text style={[styles.chapterInfo, { color: colors.textMuted }]}>
                        Cap. {fav.chapterId}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable onPress={() => handleRemove(fav)} hitSlop={10}>
                    <Ionicons name="heart" size={20} color={colors.error} />
                  </Pressable>
                </View>
                
                <View style={styles.contentContainer}>
                  <View style={[styles.numberBadge, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.numberText, { color: colors.textSecondary }]}>
                      #{fav.isGroup && fav.groupItems ? formatParagraphRange(fav.groupItems) : fav.paragraphNumber}
                    </Text>
                  </View>
                  <Text style={[styles.text, { color: colors.text }]} numberOfLines={3}>
                    {fav.paragraphText}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1,
  },
  filterText: {
    ...typography.small,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 250,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  chapterInfo: {
    ...typography.small,
  },
  contentContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numberBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    height: 24,
    justifyContent: 'center',
  },
  numberText: {
    ...typography.small,
    fontWeight: '600',
  },
  text: {
    flex: 1,
    ...typography.body,
  },
});
