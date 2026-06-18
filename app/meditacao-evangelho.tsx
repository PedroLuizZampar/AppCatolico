import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const parseMarkdownText = (text: string, style: any) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={[style, { fontWeight: 'bold' }]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return (
        <Text key={index} style={[style, { fontStyle: 'italic' }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={index} style={style}>{part}</Text>;
  });
};

const renderMarkdownInPage = (markdown: string, colors: any, isDark: boolean) => {
  if (!markdown) return null;
  const lines = markdown.split('\n');
  const elements: React.JSX.Element[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<View key={`empty-${i}`} style={{ height: 8 }} />);
      i++;
      continue;
    }

    // 1. Linha horizontal: --- ou ***
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(
        <View 
          key={`hr-${i}`} 
          style={{ 
            height: 1, 
            backgroundColor: colors.border || 'rgba(0,0,0,0.1)', 
            marginVertical: 16 
          }} 
        />
      );
      i++;
      continue;
    }

    // 2. Títulos
    if (trimmed.startsWith('# ')) {
      const titleText = trimmed.slice(2).replace(/^\*\*|^\*|\*\*$|\*$/g, '');
      elements.push(
        <Text key={`h1-${i}`} style={[typography.h2, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>
          {parseMarkdownText(titleText, [typography.h2, { color: colors.text }])}
        </Text>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const titleText = trimmed.slice(3).replace(/^\*\*|^\*|\*\*$|\*$/g, '');
      elements.push(
        <Text key={`h2-${i}`} style={[typography.h3, { color: colors.text, marginTop: 14, marginBottom: 6 }]}>
          {parseMarkdownText(titleText, [typography.h3, { color: colors.text }])}
        </Text>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      const titleText = trimmed.slice(4).replace(/^\*\*|^\*|\*\*$|\*$/g, '');
      elements.push(
        <Text key={`h3-${i}`} style={[typography.h4, { color: colors.text, marginTop: 12, marginBottom: 4 }]}>
          {parseMarkdownText(titleText, [typography.h4, { color: colors.text }])}
        </Text>
      );
      i++;
      continue;
    }

    // 3. Citações: começa com >
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().slice(1).trim());
        i++;
      }
      elements.push(
        <View 
          key={`quote-${i}`} 
          style={{
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
            paddingLeft: 12,
            marginVertical: 10,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            paddingVertical: 8,
            borderRadius: 4,
          }}
        >
          {quoteLines.map((ql, qIdx) => (
            <Text key={qIdx} style={{ marginVertical: 2 }}>
              {parseMarkdownText(ql, [typography.body, { color: colors.textSecondary, fontStyle: 'italic', lineHeight: 22 }])}
            </Text>
          ))}
        </View>
      );
      continue;
    }

    // 4. Tabelas: começa com |
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const rows = tableLines.map(rowStr => {
        const rawCols = rowStr.replace(/^\|/, '').replace(/\|$/, '').split('|');
        return rawCols.map(c => c.trim());
      });

      const filteredRows = rows.filter((row, idx) => {
        if (idx === 1 && row.every(col => /^-+$/.test(col) || col === '')) {
          return false;
        }
        return true;
      });

      if (filteredRows.length > 0) {
        elements.push(
          <View 
            key={`table-${i}`} 
            style={{
              borderWidth: 1,
              borderColor: colors.border || 'rgba(0,0,0,0.1)',
              borderRadius: 8,
              marginVertical: 12,
              overflow: 'hidden',
              backgroundColor: colors.surface,
            }}
          >
            {filteredRows.map((row, rIdx) => {
              const isHeader = rIdx === 0;
              return (
                <View 
                  key={rIdx} 
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: rIdx === filteredRows.length - 1 ? 0 : 1,
                    borderBottomColor: colors.border || 'rgba(0,0,0,0.1)',
                    backgroundColor: isHeader ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent',
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                  }}
                >
                  {row.map((col, cIdx) => (
                    <View key={cIdx} style={{ flex: 1, paddingHorizontal: 4 }}>
                      <Text>
                        {parseMarkdownText(col, [
                          typography.body,
                          {
                            color: colors.text,
                            fontWeight: isHeader ? 'bold' : 'normal',
                            fontSize: isHeader ? 14 : 13,
                          }
                        ])}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        );
      }
      continue;
    }

    // 5. Listas não ordenadas
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const indentMatch = line.match(/^(\s*)/);
      const indentSpaces = indentMatch ? indentMatch[1].length : 0;
      const extraPadding = indentSpaces > 0 ? indentSpaces * 4 : 0;

      elements.push(
        <View 
          key={`list-${i}`} 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'flex-start', 
            paddingLeft: 8 + extraPadding, 
            marginVertical: 3 
          }}
        >
          <Text style={[typography.body, { color: colors.primary, marginRight: 6 }]}>
            {indentSpaces > 0 ? '◦' : '•'}
          </Text>
          <Text style={{ flex: 1 }}>
            {parseMarkdownText(trimmed.slice(2), [typography.body, { color: colors.text }])}
          </Text>
        </View>
      );
      i++;
      continue;
    }

    // 6. Listas ordenadas (ex: "1. ")
    const numListMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numListMatch) {
      const num = numListMatch[1];
      const listContent = numListMatch[2];
      const indentMatch = line.match(/^(\s*)/);
      const indentSpaces = indentMatch ? indentMatch[1].length : 0;
      const extraPadding = indentSpaces > 0 ? indentSpaces * 4 : 0;

      elements.push(
        <View 
          key={`numlist-${i}`} 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'flex-start', 
            paddingLeft: 8 + extraPadding, 
            marginVertical: 3 
          }}
        >
          <Text style={[typography.body, { color: colors.primary, marginRight: 6, fontWeight: 'bold' }]}>
            {num}.
          </Text>
          <Text style={{ flex: 1 }}>
            {parseMarkdownText(listContent, [typography.body, { color: colors.text }])}
          </Text>
        </View>
      );
      i++;
      continue;
    }

    // 7. Texto comum
    elements.push(
      <Text key={`p-${i}`} style={{ marginVertical: 6 }}>
        {parseMarkdownText(trimmed, [typography.body, { color: colors.text, lineHeight: 24 }])}
      </Text>
    );
    i++;
  }

  return elements;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api-sanctus.onrender.com';
const getApiUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;

export default function MeditacaoEvangelhoScreen() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const [meditation, setMeditation] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeditationFromApi = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }
    setError(null);

    try {
      const url = getApiUrl('/api/v1/meditacao');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.markdown) {
        if (data.markdown !== meditation) {
          setMeditation(data.markdown);
          await AsyncStorage.setItem('@meditacao_evangelho_cache', data.markdown);
        }
      } else {
        throw new Error('Resposta do servidor em formato inválido.');
      }
    } catch (err: any) {
      console.error('[Evangelho] Erro ao buscar dados da API:', err);
      if (!meditation) {
        setError('Não foi possível carregar a meditação do Evangelho. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  // Carrega meditação do AsyncStorage e inicia a busca na API
  useEffect(() => {
    AsyncStorage.getItem('@meditacao_evangelho_cache')
      .then((cached) => {
        if (cached) {
          setMeditation(cached);
          setLoading(false);
          // Inicia atualização silenciosa em background se já houver cache
          fetchMeditationFromApi(true);
        } else {
          fetchMeditationFromApi(false);
        }
      })
      .catch(() => {
        fetchMeditationFromApi(false);
      });
  }, []);

  const handleRetry = () => {
    fetchMeditationFromApi(false);
  };

  const showLoader = loading && !meditation;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Indicador silencioso de atualização em background */}
      {isUpdating && (
        <View style={{ position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 10 }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.lg + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho com layout unificado */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.header}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="comment-text-multiple-outline" size={36} color="#9C27B0" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Evangelho Meditado</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Reflexão Diária</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            Acompanhe diariamente a meditação do Evangelho guiada e comentada.
          </Text>
        </Animated.View>

        {showLoader && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando meditação do Evangelho...
            </Text>
          </View>
        )}

        {error && !meditation && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} style={{ marginBottom: spacing.sm }} />
            <Text style={[styles.errorTitle, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>Erro ao obter meditação</Text>
            <Text style={[styles.errorText, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>{error}</Text>
            <Pressable
              onPress={handleRetry}
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </Pressable>
          </View>
        )}

        {meditation && (
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={styles.contentContainer}
          >
            {renderMarkdownInPage(meditation, colors, isDark)}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorContainer: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  retryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  contentContainer: {
    width: '100%',
  },
});
