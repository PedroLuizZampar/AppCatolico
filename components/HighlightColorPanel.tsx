import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { borderRadius, spacing } from '@/lib/theme/tokens';

export const HIGHLIGHT_COLORS = ['#FFF176', '#A5D6A7', '#90CAF9', '#F48FB1', '#CE93D8'];

interface HighlightColorPanelProps {
  selectedColor: string;
  isEraseMode: boolean;
  onColorSelect: (color: string) => void;
  onEraseToggle: () => void;
  onClose: () => void;
  colors: any; // Theme colors (getColors)
}

/**
 * Painel flutuante de cores para o modo de grifo.
 * Aparece na parte inferior da tela com animação suave.
 * 
 * - 5 círculos de cores (amarelo, verde, azul, rosa, roxo)
 * - Botão de borracha para remover grifos
 * - Botão X para fechar o modo de grifo
 */
export function HighlightColorPanel({
  selectedColor,
  isEraseMode,
  onColorSelect,
  onEraseToggle,
  onClose,
  colors,
}: HighlightColorPanelProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(300).springify()}
      exiting={FadeOutDown.duration(200)}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.helpText, { color: colors.textSecondary }]}>
        {isEraseMode 
          ? 'Toque no grifo para remover' 
          : 'Toque nas palavras para grifar'}
      </Text>
      <View style={styles.palette}>
        {HIGHLIGHT_COLORS.map(color => (
          <Pressable
            key={color}
            onPress={() => onColorSelect(color)}
            style={[
              styles.colorCircle,
              { backgroundColor: color },
              selectedColor === color && !isEraseMode && [
                styles.colorCircleSelected,
                { borderColor: colors.text },
              ],
            ]}
          />
        ))}
        <Pressable
          onPress={onEraseToggle}
          style={[
            styles.eraseBtn,
            { borderColor: colors.border },
            isEraseMode && { borderColor: colors.error, backgroundColor: colors.error + '20' },
          ]}
        >
          <Ionicons name="trash-outline" size={16} color={isEraseMode ? colors.error : colors.textMuted} />
        </Pressable>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  palette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderWidth: 3,
  },
  eraseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
});
