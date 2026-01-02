import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, borderRadius, typography } from '@/lib/theme/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  inputMode?: TextInputProps['inputMode'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChangeText, 
  placeholder = 'Buscar...',
  keyboardType,
  inputMode,
  returnKeyType,
  onSubmitEditing,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.surface,
        borderColor: isFocused ? colors.primary : colors.border,
      }
    ]}>
      <Ionicons name="search" size={18} color={isFocused ? colors.primary : colors.textMuted} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType={keyboardType}
        inputMode={inputMode}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.xs,
  },
});
