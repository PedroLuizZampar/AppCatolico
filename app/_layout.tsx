import { ThemeProvider, useTheme } from '@/lib/theme/ThemeContext';
import { getColors } from '@/lib/theme/tokens';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <Head>
        <meta name="theme-color" content={isDark ? '#000000' : '#ffffff'} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sanctus" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
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
        <Stack.Screen name="santo" options={{ title: 'Santo do Dia' }} />
        <Stack.Screen name="curiosidades" options={{ title: 'Curiosidades Católicas' }} />
        <Stack.Screen name="meditacao-evangelho" options={{ title: 'Meditação do Evangelho' }} />
        <Stack.Screen name="livros" options={{ title: 'Biblioteca de Livros' }} />
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
