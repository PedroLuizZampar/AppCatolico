import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAlert } from '../lib/context/AlertContext';
import { useTheme } from '../lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '../lib/theme/tokens';

export const CustomAlert: React.FC = () => {
  const { alertState, hideAlert } = useAlert();
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  if (!alertState.visible) return null;

  const handleButtonPress = async (onPress?: () => void | Promise<void>) => {
    hideAlert();
    if (onPress) {
      try {
        await onPress();
      } catch (err) {
        console.error('[CustomAlert] Erro ao executar ação do botão:', err);
      }
    }
  };

  const isHorizontal = alertState.buttons.length <= 2;

  return (
    <Modal
      transparent
      visible={alertState.visible}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View style={[styles.overlay, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{alertState.title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{alertState.message}</Text>
          
          <View style={[styles.buttonContainer, isHorizontal ? styles.row : styles.column]}>
            {alertState.buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              let textStyle = { color: colors.primary };
              if (isDestructive) {
                textStyle = { color: colors.error || '#D32F2F' };
              } else if (isCancel) {
                textStyle = { color: colors.textSecondary };
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isHorizontal ? styles.flexButton : null,
                    index > 0 && isHorizontal ? { marginLeft: spacing.sm } : null,
                    index > 0 && !isHorizontal ? { marginTop: spacing.xs } : null,
                    { borderColor: colors.border }
                  ]}
                  onPress={() => handleButtonPress(btn.onPress)}
                >
                  <Text style={[styles.buttonText, textStyle, btn.style === 'destructive' || btn.style === 'default' ? { fontWeight: '600' } : { fontWeight: '400' }]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    ...typography.h3,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  button: {
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  flexButton: {
    flex: 1,
  },
  buttonText: {
    ...typography.body,
    fontSize: 15,
  },
});
