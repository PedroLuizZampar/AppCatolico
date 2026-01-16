import { MeditationShareCard } from '@/components/MeditationShareCard';
import { BOOKS } from '@/lib/data';
import { useFavoritesSync } from '@/lib/hooks/useFavoritesSync';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { FavoriteParagraph } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

// Função para pegar um parágrafo aleatório de qualquer livro
const getRandomParagraph = () => {
  const allowedSlugs = new Set(['caminho', 'sulco', 'forja', 'frases-de-santos']);
  const eligibleBooks = BOOKS.filter(b => allowedSlugs.has(b.slug));
  const sourceBooks = eligibleBooks.length > 0 ? eligibleBooks : BOOKS;

  const randomBook = sourceBooks[Math.floor(Math.random() * sourceBooks.length)];
  const randomChapter = randomBook.data.chapters[
    Math.floor(Math.random() * randomBook.data.chapters.length)
  ];
  const randomParagraph = randomChapter.paragraphs[
    Math.floor(Math.random() * randomChapter.paragraphs.length)
  ];

  // Na Meditação Rápida: Caminho com paleta roxa; Frases de Santos mantém azul.
  const bookColor = randomBook.slug === 'caminho' ? '#9B59B6' : randomBook.color;

  return {
    text: randomParagraph.text,
    number: randomParagraph.number,
    chapterNumber: randomChapter.chapter,
    chapterName: randomChapter.name,
    bookTitle: randomBook.title,
    bookSlug: randomBook.slug,
    bookIcon: randomBook.icon,
    bookColor,
    bookAuthor: randomBook.author,
  };
};

type MeditationData = ReturnType<typeof getRandomParagraph>;
let cachedMeditation: MeditationData | null = null;

export default function MeditacaoScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [refreshing, setRefreshing] = useState(false);
  const [meditation, setMeditation] = useState<MeditationData>(() => cachedMeditation ?? getRandomParagraph());
  const [refreshCount, setRefreshCount] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<View>(null);
  const ignoreNextActiveRefreshUntilRef = useRef<number>(0);
  
  // Hooks de favoritos
  const { favorites, addFavorite, removeFavorite } = useFavoritesSync();
  
  // Verificar se a meditação atual é favorita
  const isFavorited = useMemo(() => {
    if (meditation.bookSlug === 'catecismo') {
      return favorites.some(
        fav => fav.bookSlug === 'catecismo' && fav.paragraphNumber === meditation.number
      );
    }

    return favorites.some(
      fav => fav.bookSlug === meditation.bookSlug &&
             fav.chapterId === meditation.chapterNumber &&
             fav.paragraphNumber === meditation.number
    );
  }, [favorites, meditation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setMeditation(getRandomParagraph());
      setRefreshCount(prev => prev + 1);
      setRefreshing(false);
    }, 500);
  }, []);

  // Persistir a meditação atual enquanto o app estiver aberto.
  React.useEffect(() => {
    cachedMeditation = meditation;
  }, [meditation]);

  // Atualizar somente quando o usuário sair do app (background) e voltar.
  React.useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', nextState => {
      const wasInBackground = previousState === 'inactive' || previousState === 'background';
      if (wasInBackground && nextState === 'active') {
        const now = Date.now();
        if (ignoreNextActiveRefreshUntilRef.current > 0 && now <= ignoreNextActiveRefreshUntilRef.current) {
          ignoreNextActiveRefreshUntilRef.current = 0;
          previousState = nextState;
          return;
        }
        setMeditation(getRandomParagraph());
        setRefreshCount(prev => prev + 1);
      }
      previousState = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleShare = useCallback(async () => {
    try {
      setIsSharing(true);
      // O share sheet pode colocar o app em background/inactive; não queremos trocar a meditação ao voltar.
      ignoreNextActiveRefreshUntilRef.current = Date.now() + 15000;
      
      // Verifica se o compartilhamento está disponível
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Erro', 'Compartilhamento não está disponível neste dispositivo');
        return;
      }

      // Captura a view como imagem
      if (shareCardRef.current) {
        const uri = await captureRef(shareCardRef, {
          format: 'png',
          quality: 1,
        });

        // Compartilha a imagem
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartilhar Meditação',
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar a meditação');
    } finally {
      setIsSharing(false);
    }
  }, []);

  const toggleFavorite = async () => {
    try {
      if (isFavorited) {
        // Remover dos favoritos
        const favToRemove = meditation.bookSlug === 'catecismo'
          ? favorites.find(fav => fav.bookSlug === 'catecismo' && fav.paragraphNumber === meditation.number)
          : favorites.find(
              fav => fav.bookSlug === meditation.bookSlug &&
                     fav.chapterId === meditation.chapterNumber &&
                     fav.paragraphNumber === meditation.number
            );
        if (favToRemove) {
          await removeFavorite(favToRemove);
        }
      } else {
        // Adicionar aos favoritos
        const newFavorite: FavoriteParagraph = {
          bookSlug: meditation.bookSlug,
          bookTitle: meditation.bookTitle,
          chapterId: meditation.chapterNumber,
          chapterName: meditation.chapterName,
          paragraphNumber: meditation.number,
          paragraphText: meditation.text,
          timestamp: Date.now(),
          type: meditation.bookSlug === 'frases-de-santos' ? 'frases' : 'livro',
        };
        await addFavorite(newFavorite);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar os favoritos');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          title: 'Meditação Rápida',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Pressable onPress={() => {
          router.push({
            pathname: '/livro/[slug]/capitulo/[id]',
            params: {
              slug: meditation.bookSlug,
              id: meditation.chapterNumber.toString(),
              paragraph: meditation.number.toString(),
            }
          });
        }}>
          <Animated.View 
            key={refreshCount}
            entering={FadeInDown.duration(600)}
            style={[styles.card, shadows.md, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.bookBadge, { backgroundColor: meditation.bookColor + '20' }]}>
              <Text style={styles.bookIcon}>{meditation.bookIcon}</Text>
              <Text style={[styles.bookTitle, { color: meditation.bookColor }]}>
                {meditation.bookTitle}
              </Text>
            </View>

            <Text style={[styles.meditationText, { color: colors.text }]}>
              {meditation.text}
            </Text>

            <View style={styles.footer}>
              <Text
                style={[styles.reference, { color: colors.textSecondary }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {meditation.bookSlug === 'frases-de-santos'
                  ? meditation.chapterName
                  : `Cap. ${meditation.chapterNumber} · ${meditation.chapterName}`}
              </Text>
              <View style={[styles.numberBadge, { backgroundColor: meditation.bookColor }]}>
                <Text style={styles.numberText}>#{meditation.number}</Text>
              </View>
            </View>
          </Animated.View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable 
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={toggleFavorite}
          >
            <Ionicons 
              name={isFavorited ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorited ? colors.error : colors.text} 
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {isFavorited ? "Favoritado" : "Favoritar"}
            </Text>
          </Pressable>

          <Pressable 
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleShare}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="share-social-outline" size={24} color={colors.text} />
            )}
            <Text style={[styles.actionText, { color: colors.text }]}>Compartilhar</Text>
          </Pressable>
        </View>

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Puxe para baixo para carregar uma nova meditação
        </Text>
      </ScrollView>

      {/* Hidden View for Sharing */}
      <View style={styles.hiddenContainer} pointerEvents="none">
        <MeditationShareCard
          ref={shareCardRef}
          text={meditation.text}
          number={meditation.number}
          chapterNumber={meditation.chapterNumber}
          chapterName={meditation.chapterName}
          bookTitle={meditation.bookTitle}
          bookIcon={meditation.bookIcon}
          bookAuthor={meditation.bookAuthor}
          bookColor={meditation.bookColor}
          date={new Date().toLocaleDateString('pt-BR')}
          hideChapterNumber={meditation.bookSlug === 'frases-de-santos'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  bookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.lg,
  },
  bookIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  bookTitle: {
    ...typography.small,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  meditationText: {
    ...typography.h3,
    lineHeight: 32,
    marginBottom: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: spacing.md,
  },
  reference: {
    ...typography.small,
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  numberBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    flexShrink: 0,
  },
  numberText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  actionText: {
    ...typography.body,
    fontWeight: '500',
  },
  hint: {
    textAlign: 'center',
    ...typography.small,
  },
  hiddenContainer: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    opacity: 0,
  },
});
