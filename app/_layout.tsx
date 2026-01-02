import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@/lib/theme/ThemeContext';
import { getColors } from '@/lib/theme/tokens';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="meditacao" options={{ title: 'Meditação Rápida' }} />
        <Stack.Screen name="buscar" options={{ title: 'Buscar' }} />
        <Stack.Screen name="favoritos" options={{ title: 'Favoritos' }} />
        <Stack.Screen name="biblia/[livro]/index" options={{ title: 'Livro' }} />
        <Stack.Screen name="biblia/[livro]/capitulo/[id]" options={{ title: 'Capítulo' }} />
        <Stack.Screen name="livro/sao-josemaria" options={{ title: 'São Josemaria' }} />
        <Stack.Screen name="livro/[slug]/index" options={{ title: 'Livro' }} />
        <Stack.Screen name="livro/[slug]/capitulo/[id]" options={{ title: 'Capítulo' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
