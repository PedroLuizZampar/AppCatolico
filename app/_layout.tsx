import { ThemeProvider, useTheme } from '@/lib/theme/ThemeContext';
import { DateProvider } from '@/lib/context/DateContext';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import { AlertProvider } from '@/lib/context/AlertContext';
import { CustomAlert } from '@/components/CustomAlert';
import { getColors } from '@/lib/theme/tokens';
import { Stack, useRouter, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastContainer } from '@/components/ToastContainer';
import { View, ActivityIndicator } from 'react-native';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Inicialização silenciosa do banco de dados local SQLite
    import('../lib/sqlite/sqliteDatabase')
      .then(({ initializeDatabase }) => initializeDatabase())
      .then(() => setDbReady(true))
      .catch(err => {
        console.error('[SQLite] Erro ao carregar/inicializar banco de dados:', err);
        setDbReady(true); // Evita travar a UI em caso de falha no banco
      });
  }, []);

  useEffect(() => {
    if (!dbReady || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Se não estiver logado e não estiver nas rotas de login/registro, redireciona para login
      router.replace('/(auth)/login');
      SplashScreen.hideAsync().catch(() => {});
    } else if (user && inAuthGroup) {
      // Se estiver logado e tentar entrar em login/registro, redireciona para a home
      router.replace('/(tabs)');
      SplashScreen.hideAsync().catch(() => {});
    } else {
      // Caso contrário, apenas esconde a splash screen
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [user, loading, dbReady, segments]);

  if (!dbReady || loading) {
    // Mostra um loading rápido enquanto inicializa a sessão/banco
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="santo" options={{ title: 'Santo do Dia' }} />
        <Stack.Screen name="curiosidades" options={{ title: 'Curiosidades Católicas' }} />
        <Stack.Screen name="meditacao-evangelho" options={{ title: 'Meditação do Evangelho' }} />
        <Stack.Screen name="livros" options={{ title: 'Biblioteca de Livros' }} />
        <Stack.Screen name="meditacao" options={{ title: 'Meditação Rápida' }} />
        <Stack.Screen name="buscar" options={{ title: 'Buscar' }} />
        <Stack.Screen name="favoritos" options={{ title: 'Favoritos' }} />
        <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
        <Stack.Screen name="biblia/[livro]/index" options={{ title: 'Livro' }} />
        <Stack.Screen name="biblia/[livro]/capitulo/[id]" options={{ title: 'Capítulo' }} />
        <Stack.Screen name="livro/sao-josemaria" options={{ title: 'São Josemaria' }} />
        <Stack.Screen name="livro/[slug]/index" options={{ title: 'Livro' }} />
        <Stack.Screen name="livro/[slug]/capitulo/[id]" options={{ title: 'Capítulo' }} />
      </Stack>
      <CustomAlert />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <DateProvider>
            <AlertProvider>
              <RootLayoutNav />
              <ToastContainer />
            </AlertProvider>
          </DateProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
