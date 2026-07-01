import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors } from '@/lib/theme/tokens';

export default function AuthLayout() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
