import { MeditationShareCard } from '@/components/MeditationShareCard';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Animated as RNAnimated, Share, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

import { getBookBySlug } from '@/lib/data';
import { useFavoritesSync } from '@/lib/hooks/useFavoritesSync';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { FavoriteParagraph } from '@/lib/types';
import { getViaSacraImageSource } from '@/lib/viaSacra';

// Componente memoizado para cada parágrafo
const ParagraphItem = React.memo<{
  paragraph: { number: number; text: string };
  selected: boolean;
  favorito: boolean;
  colors: any;
  onPress: () => void;
  onLongPress: () => void;
  highlightOpacity?: RNAnimated.Value;
}>(({
  paragraph,
  selected,
  favorito,
  colors,
  onPress,
  onLongPress,
  highlightOpacity,
}) => {
  const backgroundOpacity = highlightOpacity || new RNAnimated.Value(selected ? 1 : 0);
  
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={[
        styles.paragraphContainer,
        favorito && styles.paragraphFavorite,
      ]}
    >
      {selected && (
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
              opacity: backgroundOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.2],
              }),
            },
          ]}
        />
      )}
      <View style={styles.paragraphContent}>
        <Text style={[styles.paragraphNumber, { color: colors.primary }]}>
          {paragraph.number}
        </Text>
        <View style={styles.paragraphTextContainer}>
          <Text style={[styles.paragraphText, { color: colors.text }]}>
            {paragraph.text}
          </Text>
        </View>
      </View>
      {favorito && (
        <Ionicons 
          name="heart" 
          size={14} 
          color={colors.error} 
          style={styles.favoriteIcon}
        />
      )}
    </Pressable>
  );
});

ParagraphItem.displayName = 'ParagraphItem';

const formatNumberRanges = (numbers: number[]): string => {
  const sorted = [...numbers].filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === end + 1) {
      end = n;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = n;
      end = n;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
};

export default function ChapterScreen() {
  const { slug, id, paragraph } = useLocalSearchParams<{ slug: string; id: string; paragraph?: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  
  const flatListRef = useRef<FlatList>(null);
  const shareCardRef = useRef<View>(null);
  const highlightOpacity = useRef(new RNAnimated.Value(0)).current;
  const { favorites, isFavorite: checkIsFavorite, addFavorites, removeFavorites } = useFavoritesSync();
  
  const [selectedParagraphs, setSelectedParagraphs] = useState<number[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);
  const [isDeepLinking, setIsDeepLinking] = useState(false);

  // Gestos para o menu flutuante
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const context = useSharedValue({ x: 0, y: 0 });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
      translateY.value = event.translationY + context.value.y;
    });

  const animatedMenuStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Resetar posição do menu quando fechar
  useEffect(() => {
    if (!showMenu) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  }, [showMenu, translateX, translateY]);
  
  // Converter ID para número
  const currentChapterId = parseInt(id || '1', 10);
  
  // Carregar dados
  const book = getBookBySlug(slug);
  const chapter = book?.data.chapters.find(c => c.chapter === currentChapterId);
  const isCatecismo = slug === 'catecismo';
  const isViaSacra = slug === 'via-sacra';
  const isFrasesDeSantos = slug === 'frases-de-santos';
  const isMisteriosTerco = slug === 'misterios-terco';

  const viaSacraImage = useMemo(() => {
    if (!isViaSacra) return undefined;
    return getViaSacraImageSource(currentChapterId);
  }, [isViaSacra, currentChapterId]);

  const viaSacraStationLabel = useMemo(() => {
    if (!isViaSacra || !chapter?.name) return undefined;
    // chapter.name vem como "1° Estação — Título"; queremos só "1° Estação"
    return chapter.name.split('—')[0]?.trim() || chapter.name;
  }, [isViaSacra, chapter?.name]);

  const chapterIndicatorLabel = useMemo(() => {
    if (isCatecismo) return chapter?.name;
    if (isViaSacra) return viaSacraStationLabel ?? chapter?.name;
    if (isFrasesDeSantos) return chapter?.name;
    if (isMisteriosTerco) return chapter?.name;
    return chapter?.name;
  }, [isCatecismo, isViaSacra, isFrasesDeSantos, isMisteriosTerco, chapter?.name, viaSacraStationLabel]);

  const viaSacraHeadingColor = useMemo(() => {
    // Queremos um cinza mais claro para diferenciar os títulos (h4)
    return isDark ? colors.textSecondary : colors.textMuted;
  }, [isDark, colors.textSecondary, colors.textMuted]);

  // Navegação entre capítulos
  const handlePrevChapter = () => {
    if (!book) return;
    // Encontrar o índice atual
    const currentIndex = book.data.chapters.findIndex(c => c.chapter === currentChapterId);
    if (currentIndex > 0) {
      const prevChapter = book.data.chapters[currentIndex - 1];
      router.setParams({ id: prevChapter.chapter.toString() });
    }
  };

  const handleNextChapter = () => {
    if (!book) return;
    // Encontrar o índice atual
    const currentIndex = book.data.chapters.findIndex(c => c.chapter === currentChapterId);
    if (currentIndex < book.data.chapters.length - 1) {
      const nextChapter = book.data.chapters[currentIndex + 1];
      router.setParams({ id: nextChapter.chapter.toString() });
    }
  };

  // Resetar scroll e seleção ao mudar de capítulo
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
    setSelectedParagraphs([]);
    setShowMenu(false);
    setLongPressActive(false);
  }, [currentChapterId]);

  // Scroll até o parágrafo específico (deep link ou busca)
  useEffect(() => {
    if (isViaSacra || isMisteriosTerco) return;
    if (paragraph && chapter) {
      const paragraphs = paragraph.split(',').map(p => parseInt(p)).filter(n => !isNaN(n));
      
      if (paragraphs.length > 0) {
        // Encontrar o índice do parágrafo na lista
        const index = chapter.paragraphs.findIndex(p => p.number === paragraphs[0]);
        
        if (index !== -1) {
          // Tentar scrollar imediatamente se possível, ou aguardar
          const tryScroll = (attempts = 0) => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({ 
                index, 
                animated: true,
                viewPosition: 0.3 
              });
              
              // Aplicar highlight
              setSelectedParagraphs(paragraphs);
              setIsDeepLinking(true);
              highlightOpacity.setValue(1);
              
              setTimeout(() => {
                RNAnimated.timing(highlightOpacity, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: true,
                }).start(() => {
                  setIsDeepLinking(false);
                });
              }, 1500);
            } else if (attempts < 5) {
              // Se a ref não estiver pronta, tentar novamente em breve
              setTimeout(() => tryScroll(attempts + 1), 200);
            }
          };

          // Pequeno delay inicial para garantir montagem
          setTimeout(() => tryScroll(), 500);
        }
      }
    }
  }, [paragraph, currentChapterId, chapter, isViaSacra, isMisteriosTerco, highlightOpacity]);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
    setSelectedParagraphs([]);
    setLongPressActive(false);
  }, []);

  // Handlers de seleção
  const handleParagraphPress = useCallback((paragraphNum: number) => {
    if (isViaSacra || isMisteriosTerco) return;
    if (longPressActive) {
      if (selectedParagraphs.includes(paragraphNum)) {
        setSelectedParagraphs(prev => {
          const next = prev.filter(p => p !== paragraphNum);
          if (next.length === 0) {
            setShowMenu(false);
            setLongPressActive(false);
          }
          return next;
        });
      } else {
        setSelectedParagraphs(prev => [...prev, paragraphNum].sort((a, b) => a - b));
      }
    } else {
      if (selectedParagraphs.length === 1 && selectedParagraphs[0] === paragraphNum) {
        // Segundo toque no mesmo parágrafo: desmarcar de verdade
        handleCloseMenu();
      } else {
        setSelectedParagraphs([paragraphNum]);
        setShowMenu(true);
      }
    }
  }, [longPressActive, selectedParagraphs, handleCloseMenu, isViaSacra, isMisteriosTerco]);

  const handleParagraphLongPress = useCallback((paragraphNum: number) => {
    if (isViaSacra || isMisteriosTerco) return;
    setLongPressActive(true);
    if (!selectedParagraphs.includes(paragraphNum)) {
      setSelectedParagraphs(prev => [...prev, paragraphNum].sort((a, b) => a - b));
    }
    setShowMenu(true);
  }, [selectedParagraphs, isViaSacra, isMisteriosTerco]);

  // Ações do Menu
  const handleCopyParagraphs = async () => {
    if (selectedParagraphs.length === 0 || !chapter || !book) return;
    
    const textoParts = selectedParagraphs.map(num => {
      const p = chapter.paragraphs.find(p => p.number === num);
      return p ? `[${num}] ${p.text}` : '';
    }).filter(Boolean);

    const header = isCatecismo
      ? `CIC §[${formatNumberRanges(selectedParagraphs)}]`
      : `${book.title} - Cap. ${chapter.chapter}`;

    const textoCompleto = `${header}\n\n${textoParts.join('\n\n')}`;

    await Clipboard.setStringAsync(textoCompleto);
    Alert.alert('Copiado!', `${selectedParagraphs.length} parágrafo(s) copiado(s).`);
    handleCloseMenu();
  };

  const handleFavoriteParagraphs = async () => {
    if (selectedParagraphs.length === 0 || !chapter || !book) return;
    
    try {
      const groupId = selectedParagraphs.length > 1 ? `${slug}-${currentChapterId}-${Date.now()}` : undefined;
      const groupRange = selectedParagraphs.length > 1 ? formatNumberRanges(selectedParagraphs) : undefined;

      const toAdd: FavoriteParagraph[] = [];
      const toRemove: FavoriteParagraph[] = [];

      for (const pNum of selectedParagraphs) {
        const p = chapter.paragraphs.find(item => item.number === pNum);
        if (!p) continue;

        const existingFav = isCatecismo
          ? favorites.find(fav => fav.bookSlug === 'catecismo' && fav.paragraphNumber === pNum)
          : favorites.find(
              fav => fav.bookSlug === slug && 
                     fav.chapterId === currentChapterId && 
                     fav.paragraphNumber === pNum
            );

        if (existingFav) {
          toRemove.push(existingFav);
        } else {
          toAdd.push({
            bookSlug: slug,
            bookTitle: book.title,
            chapterId: currentChapterId,
            chapterName: isCatecismo || isFrasesDeSantos ? chapter.name : `Capítulo ${chapter.chapter}`,
            paragraphNumber: pNum,
            paragraphText: p.text,
            timestamp: Date.now(),
            type: isFrasesDeSantos ? 'frases' : 'livro',
            groupId,
            groupRange,
          });
        }
      }

      if (toRemove.length > 0) {
        await removeFavorites(toRemove);
      }
      
      if (toAdd.length > 0) {
        await addFavorites(toAdd);
      }
      
      if (toAdd.length > 0) Alert.alert('Salvo!', `${toAdd.length} parágrafo(s) adicionado(s) aos favoritos.`);
      else if (toRemove.length > 0) Alert.alert('Removido', `${toRemove.length} parágrafo(s) removido(s) dos favoritos.`);
      
      handleCloseMenu();
    } catch (error) {
      console.error('Erro ao favoritar:', error);
      Alert.alert('Erro', 'Não foi possível salvar os favoritos.');
    }
  };

  const handleShareParagraphs = async () => {
    if (selectedParagraphs.length === 0 || !chapter || !book) return;
    
    if (selectedParagraphs.length === 1) {
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Erro', 'Compartilhamento não disponível');
          return;
        }
        
        if (shareCardRef.current) {
             const uri = await captureRef(shareCardRef, {
              format: 'png',
              quality: 1,
            });
            await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Erro', 'Falha ao compartilhar imagem.');
      }
      handleCloseMenu();
      return;
    }

    const textoParts = selectedParagraphs.map(num => {
      const p = chapter.paragraphs.find(item => item.number === num);
      return p ? `[${num}] ${p.text}` : '';
    }).filter(Boolean);

    const textoCompleto = `${book.title} - Cap. ${chapter.chapter}\n\n${textoParts.join('\n\n')}`;

    try {
      await Share.share({ message: textoCompleto });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
    handleCloseMenu();
  };

  if (!book || !chapter) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Capítulo não encontrado
        </Text>
      </View>
    );
  }

  const currentIndex = book.data.chapters.findIndex(c => c.chapter === currentChapterId);
  const isFirstChapter = currentIndex === 0;
  const isLastChapter = currentIndex === book.data.chapters.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          title: isCatecismo ? 'Catecismo' : book.title,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />

      {/* Barra de Navegação Fixa no Topo */}
      <View
        style={[
          styles.navigationBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
          (isViaSacra || isMisteriosTerco) && { borderBottomWidth: 0 },
        ]}
      >
        <Pressable 
          onPress={handlePrevChapter} 
          disabled={isFirstChapter}
          style={[styles.navButton, isFirstChapter && styles.navButtonDisabled]}
        >
          <Ionicons name="chevron-back" size={24} color={isFirstChapter ? colors.textMuted : colors.primary} />
          <Text style={[styles.navButtonText, { color: isFirstChapter ? colors.textMuted : colors.primary }]}>
            Anterior
          </Text>
        </Pressable>

        <View style={styles.chapterIndicator}>
          <Text
            style={[
              styles.chapterIndicatorText,
              { color: colors.text },
              isViaSacra && styles.chapterIndicatorTextViaSacra,
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {chapterIndicatorLabel}
          </Text>
        </View>

        <Pressable 
          onPress={handleNextChapter} 
          disabled={isLastChapter}
          style={[styles.navButton, isLastChapter && styles.navButtonDisabled]}
        >
          <Text style={[styles.navButtonText, { color: isLastChapter ? colors.textMuted : colors.primary }]}>
            Próximo
          </Text>
          <Ionicons name="chevron-forward" size={24} color={isLastChapter ? colors.textMuted : colors.primary} />
        </Pressable>
      </View>

      {/* Menu Flutuante */}
      {!isViaSacra && !isMisteriosTerco && showMenu && selectedParagraphs.length > 0 && (
        <GestureDetector gesture={panGesture}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.menuContainerFixed, 
              { backgroundColor: colors.surface, borderColor: colors.border },
              animatedMenuStyle
            ]}
          >
            <View style={styles.menuHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="move" size={20} color={colors.textMuted} />
                <Text style={[styles.menuTitle, { color: colors.text }]}>
                  {selectedParagraphs.length} selecionado{selectedParagraphs.length > 1 ? 's' : ''}
                </Text>
              </View>
              <Pressable onPress={handleCloseMenu} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.menuActions}>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleCopyParagraphs}>
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Copiar</Text>
              </Pressable>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleFavoriteParagraphs}>
                <Ionicons name="heart" size={18} color={colors.error} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Favoritar</Text>
              </Pressable>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleShareParagraphs}>
                <Ionicons name="share-outline" size={18} color={colors.primary} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Compartilhar</Text>
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
      )}

      {/* Lista de Parágrafos */}
      <FlatList
        ref={flatListRef}
        data={chapter.paragraphs}
        keyExtractor={(item) => item.number.toString()}
        ListHeaderComponent={
          isViaSacra && viaSacraImage ? (
            <View style={styles.viaSacraHeader}>
              <Image
                source={viaSacraImage}
                style={styles.viaSacraImage}
                contentFit="contain"
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (isViaSacra || isMisteriosTerco) {
            const label = item.label?.trim();
            
            // Para Via Sacra
            const isVersiculo = isViaSacra && label === 'Versículo';
            const isResposta = isViaSacra && label === 'Resposta';
            const isOracoesTradicionais = isViaSacra && label === 'Orações tradicionais';
            
            // Para Mistérios do Terço: sempre mostrar label + texto
            const isMisterioItem = isMisteriosTerco && label;

            return (
              <View style={styles.viaSacraField}>
                {isMisterioItem ? (
                  <>
                    <Text style={[styles.misterioLabel, { color: colors.primary }]}>
                      {label}
                    </Text>
                    <Text style={[styles.misterioText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </>
                ) : isVersiculo || isResposta ? (
                  <Text style={styles.viaSacraInlineLine}>
                    <Text style={[styles.viaSacraInlinePrefix, { color: colors.textMuted }]}>
                      {isVersiculo ? '℣:' : '℟:'}{' '}
                    </Text>
                    <Text style={[styles.viaSacraInlineText, { color: viaSacraHeadingColor }]}>
                      {item.text}
                    </Text>
                  </Text>
                ) : isOracoesTradicionais ? (
                  <Text style={[styles.viaSacraTraditionText, { color: colors.text }]}>
                    {item.text}
                  </Text>
                ) : (
                  <>
                    {label ? (
                      <Text style={[styles.viaSacraFieldLabel, { color: viaSacraHeadingColor }]}>
                        {label}
                      </Text>
                    ) : null}

                    <Text style={[styles.viaSacraFieldText, { color: colors.text }]}>
                      {item.text}
                    </Text>
                  </>
                )}
              </View>
            );
          }

          const selected = selectedParagraphs.includes(item.number);
          const favorito = checkIsFavorite(slug, currentChapterId, item.number);
          
          const targetParagraphs = paragraph ? paragraph.split(',').map(p => parseInt(p)).filter(n => !isNaN(n)) : [];
          const isDeepLinkTarget = isDeepLinking && targetParagraphs.includes(item.number);

          return (
            <ParagraphItem
              paragraph={item}
              selected={selected}
              favorito={favorito}
              colors={colors}
              onPress={() => handleParagraphPress(item.number)}
              onLongPress={() => handleParagraphLongPress(item.number)}
              highlightOpacity={isDeepLinkTarget ? highlightOpacity : undefined}
            />
          );
        }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        onScrollToIndexFailed={(info) => {
          // Fallback confiável para listas com altura variável
          // 1) aproxima com scrollToOffset usando o tamanho médio
          // 2) re-tenta o scrollToIndex depois que mais itens forem medidos
          const approximateOffset = info.averageItemLength * info.index;
          flatListRef.current?.scrollToOffset({ offset: approximateOffset, animated: true });

          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
          }, 350);
        }}
      />

      {/* Hidden View for Sharing */}
      <View style={{ position: 'absolute', left: -9999, top: 0, opacity: 0 }} pointerEvents="none">
        <MeditationShareCard
          ref={shareCardRef}
          text={selectedParagraphs.length === 1 ? chapter.paragraphs.find(p => p.number === selectedParagraphs[0])?.text || '' : ''}
          number={selectedParagraphs.length === 1 ? selectedParagraphs[0] : 0}
          chapterNumber={currentChapterId}
          chapterName={isCatecismo || isViaSacra || isFrasesDeSantos || isMisteriosTerco ? chapter.name : `Capítulo ${currentChapterId}`}
          bookTitle={book.title}
          bookIcon={book.icon}
          bookAuthor={book.author}
          bookColor={book.color}
          date={new Date().toLocaleDateString('pt-BR')}
          hideChapterNumber={isFrasesDeSantos || isMisteriosTerco}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    zIndex: 10,
    elevation: 2,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    gap: 4,
    flexShrink: 0,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  chapterIndicator: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.round,
  },
  chapterIndicatorText: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  chapterIndicatorTextViaSacra: {
    ...typography.h4,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
  },
  paragraphContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 2,
  },
  paragraphFavorite: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  paragraphContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  paragraphTextContainer: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  paragraphNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: spacing.md,
    marginTop: 2,
    minWidth: 22,
  },
  paragraphText: {
    ...typography.body,
    lineHeight: 26,
    fontSize: 16,
  },
  favoriteIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  viaSacraHeader: {
    marginBottom: spacing.lg,
  },
  viaSacraImage: {
    width: '100%',
    height: 190,
  },
  viaSacraField: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  viaSacraFieldLabel: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  viaSacraFieldText: {
    ...typography.body,
    lineHeight: 26,
    fontSize: 16,
  },
  viaSacraInlineLine: {
    ...typography.h4,
    lineHeight: 24,
  },
  viaSacraInlinePrefix: {
    ...typography.h4,
  },
  viaSacraInlineText: {
    ...typography.h4,
  },
  viaSacraTraditionText: {
    ...typography.h4,
    lineHeight: 24,
  },
  misterioLabel: {
    ...typography.h4,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  misterioText: {
    ...typography.body,
    lineHeight: 26,
    fontSize: 16,
  },
  menuContainerFixed: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  menuTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  menuActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  menuButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  menuButtonText: {
    ...typography.small,
    fontWeight: '600',
    fontSize: 12,
  },
});
