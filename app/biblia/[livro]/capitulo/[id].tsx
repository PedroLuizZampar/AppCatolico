import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Share, FlatList, Dimensions, Animated as RNAnimated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { MeditationShareCard } from '@/components/MeditationShareCard';

import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius } from '@/lib/theme/tokens';
import { getLivroBiblicoBySlug, getCapituloBiblia } from '@/lib/bibliaData';
import { Versiculo, FavoriteParagraph } from '@/lib/types';
import { useFavoritesSync } from '@/lib/hooks/useFavoritesSync';

// Componente memoizado para cada versículo
const VersiculoItem = React.memo<{
  versiculo: Versiculo;
  selected: boolean;
  favorito: boolean;
  colors: any;
  onPress: () => void;
  onLongPress: () => void;
  highlightOpacity?: RNAnimated.Value;
}>(({
  versiculo,
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
        styles.versiculoContainer,
        favorito && styles.versiculoFavorito,
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
      <View style={styles.versiculoContent}>
        <Text style={[styles.versiculoNumber, { color: colors.primary }]}>
          {versiculo.versiculo}
        </Text>
        <View style={styles.versiculoTextContainer}>
          <Text style={[styles.versiculoTexto, { color: colors.text }]}>
            {versiculo.texto}
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

VersiculoItem.displayName = 'VersiculoItem';

export default function CapituloBibliaScreen() {
  const { livro: livroSlug, id: idStr, paragraph } = useLocalSearchParams<{ livro: string; id: string; paragraph?: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  
  const flatListRef = useRef<FlatList>(null);
  const shareCardRef = useRef<View>(null);
  const highlightOpacity = useRef(new RNAnimated.Value(0)).current;
  const { favorites, isFavorite: checkIsFavorite, addFavorite, addFavorites, removeFavorite, removeFavorites } = useFavoritesSync();
  
  const [selectedVersiculos, setSelectedVersiculos] = useState<number[]>([]);
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
  }, [showMenu]);
  
  // Converter ID para número
  const currentChapterId = parseInt(idStr || '1', 10);
  
  // Carregar dados
  const livro = getLivroBiblicoBySlug(livroSlug);
  const capitulo = getCapituloBiblia(livroSlug, currentChapterId);

  // Navegação entre capítulos
  const handlePrevChapter = () => {
    if (currentChapterId > 1) {
      router.setParams({ id: (currentChapterId - 1).toString() });
    }
  };

  const handleNextChapter = () => {
    if (livro && currentChapterId < livro.capitulos.length) {
      router.setParams({ id: (currentChapterId + 1).toString() });
    }
  };

  // Resetar scroll e seleção ao mudar de capítulo
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
    setSelectedVersiculos([]);
    setShowMenu(false);
    setLongPressActive(false);
  }, [currentChapterId]);

  // Scroll até o versículo específico (deep link ou busca)
  useEffect(() => {
    if (paragraph && capitulo) {
      const paragraphs = paragraph.split(',').map(p => parseInt(p)).filter(n => !isNaN(n));
      
      if (paragraphs.length > 0) {
        // Encontrar o índice real do versículo na lista
        const index = capitulo.versiculos.findIndex((v: Versiculo) => v.versiculo === paragraphs[0]);
        
        if (index !== -1) {
          // Pequeno delay para garantir que a lista renderizou
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ 
              index, 
              animated: true,
              viewPosition: 0.3 
            });
            
            setSelectedVersiculos(paragraphs);
            setIsDeepLinking(true);
            highlightOpacity.setValue(1);
            
            const highlightTimer = setTimeout(() => {
              RNAnimated.timing(highlightOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }).start(() => {
                // Não limpar seleção se for deep link de favoritos
                // setSelectedVersiculos([]); 
                setIsDeepLinking(false);
              });
            }, 1000);
          }, 500);
        }
      }
    }
  }, [paragraph, currentChapterId, capitulo]);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
    setSelectedVersiculos([]);
    setLongPressActive(false);
  }, []);

  // Handlers de seleção (mantidos)
  const handleVersiculoPress = useCallback((versiculoNum: number) => {
    if (longPressActive) {
      if (selectedVersiculos.includes(versiculoNum)) {
        setSelectedVersiculos(prev => {
          const next = prev.filter(v => v !== versiculoNum);
          if (next.length === 0) {
            setShowMenu(false);
            setLongPressActive(false);
          }
          return next;
        });
      } else {
        setSelectedVersiculos(prev => [...prev, versiculoNum].sort((a, b) => a - b));
      }
    } else {
      if (selectedVersiculos.length === 1 && selectedVersiculos[0] === versiculoNum) {
        handleCloseMenu();
      } else {
        setSelectedVersiculos([versiculoNum]);
        setShowMenu(true);
      }
    }
  }, [longPressActive, selectedVersiculos, handleCloseMenu]);

  const handleVersiculoLongPress = useCallback((versiculoNum: number) => {
    setLongPressActive(true);
    if (!selectedVersiculos.includes(versiculoNum)) {
      setSelectedVersiculos(prev => [...prev, versiculoNum].sort((a, b) => a - b));
    }
    setShowMenu(true);
  }, [selectedVersiculos]);

  // Ações do Menu
  const handleCopyVersiculos = async () => {
    if (selectedVersiculos.length === 0 || !capitulo || !livro) return;
    
    const textoParts = selectedVersiculos.map(num => {
      const versiculo = capitulo.versiculos.find((v: Versiculo) => v.versiculo === num);
      return versiculo ? `${num} ${versiculo.texto}` : '';
    }).filter(Boolean);

    const textoCompleto = `${livro.nome} ${capitulo.capitulo}:${selectedVersiculos[0]}${selectedVersiculos.length > 1 ? '-' + selectedVersiculos[selectedVersiculos.length - 1] : ''}\n\n${textoParts.join('\n')}`;

    await Clipboard.setStringAsync(textoCompleto);
    Alert.alert('Copiado!', `${selectedVersiculos.length} versículo(s) copiado(s).`);
    handleCloseMenu();
  };

  const handleFavoriteVersiculos = async () => {
    if (selectedVersiculos.length === 0 || !capitulo || !livro) return;
    
    try {
      const groupId = selectedVersiculos.length > 1 ? `${livroSlug}-${currentChapterId}-${Date.now()}` : undefined;
      const groupRange = selectedVersiculos.length > 1 ? `${selectedVersiculos[0]}-${selectedVersiculos[selectedVersiculos.length - 1]}` : undefined;

      const toAdd: FavoriteParagraph[] = [];
      const toRemove: FavoriteParagraph[] = [];

      for (const versiculoNum of selectedVersiculos) {
        const versiculo = capitulo.versiculos.find((v: Versiculo) => v.versiculo === versiculoNum);
        if (!versiculo) continue;

        const existingFav = favorites.find(
          fav => fav.bookSlug === livroSlug && 
                 fav.chapterId === currentChapterId && 
                 fav.paragraphNumber === versiculoNum
        );

        if (existingFav) {
          toRemove.push(existingFav);
        } else {
          toAdd.push({
            bookSlug: livroSlug,
            bookTitle: livro.nome,
            chapterId: currentChapterId,
            chapterName: `Capítulo ${capitulo.capitulo}`,
            paragraphNumber: versiculoNum,
            paragraphText: versiculo.texto,
            timestamp: Date.now(),
            type: 'biblia',
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
      
      if (toAdd.length > 0) Alert.alert('Salvo!', `${toAdd.length} versículo(s) adicionado(s) aos favoritos.`);
      else if (toRemove.length > 0) Alert.alert('Removido', `${toRemove.length} versículo(s) removido(s) dos favoritos.`);
      
      handleCloseMenu();
    } catch (error) {
      console.error('Erro ao favoritar:', error);
      Alert.alert('Erro', 'Não foi possível salvar os favoritos.');
    }
  };

  const handleShareVersiculos = async () => {
    if (selectedVersiculos.length === 0 || !capitulo || !livro) return;
    
    if (selectedVersiculos.length === 1) {
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

    const textoParts = selectedVersiculos.map(num => {
      const versiculo = capitulo.versiculos.find((v: Versiculo) => v.versiculo === num);
      return versiculo ? `${num} ${versiculo.texto}` : '';
    }).filter(Boolean);

    const textoCompleto = `${livro.nome} ${capitulo.capitulo}:${selectedVersiculos[0]}${selectedVersiculos.length > 1 ? '-' + selectedVersiculos[selectedVersiculos.length - 1] : ''}\n\n${textoParts.join('\n')}`;

    try {
      await Share.share({ message: textoCompleto });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
    handleCloseMenu();
  };

  if (!livro || !capitulo) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Capítulo não encontrado
        </Text>
      </View>
    );
  }

  const isFirstChapter = currentChapterId === 1;
  const isLastChapter = currentChapterId === livro.capitulos.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          title: livro.nome,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />

      {/* Barra de Navegação Fixa no Topo */}
      <View style={[styles.navigationBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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
          <Text style={[styles.chapterIndicatorText, { color: colors.text }]}>
            Capítulo {currentChapterId}
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

      {/* Menu Flutuante (quando versículos selecionados) */}
      {showMenu && selectedVersiculos.length > 0 && (
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
                  {selectedVersiculos.length} selecionado{selectedVersiculos.length > 1 ? 's' : ''}
                </Text>
              </View>
              <Pressable onPress={handleCloseMenu} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.menuActions}>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleCopyVersiculos}>
                <Ionicons name="copy-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Copiar</Text>
              </Pressable>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleFavoriteVersiculos}>
                <Ionicons name="heart" size={22} color={colors.error} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Favoritar</Text>
              </Pressable>
              <Pressable style={[styles.menuButton, { backgroundColor: colors.surfaceLight }]} onPress={handleShareVersiculos}>
                <Ionicons name="share-outline" size={22} color={colors.primary} />
                <Text style={[styles.menuButtonText, { color: colors.text }]}>Compartilhar</Text>
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
      )}

      {/* Lista de Versículos */}
      <FlatList
        ref={flatListRef}
        data={capitulo.versiculos}
        keyExtractor={(item) => item.versiculo.toString()}
        renderItem={({ item }) => {
          const selected = selectedVersiculos.includes(item.versiculo);
          const favorito = favorites.some(
            fav => fav.bookSlug === livroSlug && 
                   fav.chapterId === currentChapterId && 
                   fav.paragraphNumber === item.versiculo
          );
          
          const targetParagraphs = paragraph ? paragraph.split(',').map(p => parseInt(p)).filter(n => !isNaN(n)) : [];
          const isDeepLinkTarget = isDeepLinking && targetParagraphs.includes(item.versiculo);

          return (
            <VersiculoItem
              versiculo={item}
              selected={selected}
              favorito={favorito}
              colors={colors}
              onPress={() => handleVersiculoPress(item.versiculo)}
              onLongPress={() => handleVersiculoLongPress(item.versiculo)}
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
          text={selectedVersiculos.length === 1 ? capitulo.versiculos.find((v: Versiculo) => v.versiculo === selectedVersiculos[0])?.texto || '' : ''}
          number={selectedVersiculos.length === 1 ? selectedVersiculos[0] : 0}
          chapterNumber={currentChapterId}
          chapterName={`Capítulo ${currentChapterId}`}
          bookTitle={livro.nome}
          bookIcon="📖"
          bookAuthor="Bíblia Sagrada"
          bookColor={colors.primary}
          date={new Date().toLocaleDateString('pt-BR')}
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
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  chapterIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  chapterIndicatorText: {
    ...typography.body,
    fontWeight: '700',
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
  versiculoContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 2,
  },
  versiculoFavorito: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  versiculoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  versiculoTextContainer: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  versiculoNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: spacing.md,
    marginTop: 2,
    minWidth: 22,
  },
  versiculoTexto: {
    ...typography.body,
    lineHeight: 26,
    fontSize: 16,
  },
  favoriteIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  menuContainerFixed: {
    position: 'absolute',
    top: 60, // Abaixo da barra de navegação
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
