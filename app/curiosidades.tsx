import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

export default function CuriosidadesScreen() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const [curiosities, setCuriosities] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCuriositiesFromApi = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }
    setError(null);

    try {
      const url = getApiUrl('/api/v1/curiosidades');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.markdown) {
        if (data.markdown !== curiosities) {
          setCuriosities(data.markdown);
          await AsyncStorage.setItem('@curiosidades_catolicas_cache', data.markdown);
        }
      } else {
        throw new Error('Resposta do servidor em formato inválido.');
      }
    } catch (err: any) {
      console.error('[Curiosidades] Erro ao buscar dados da API:', err);
      if (!curiosities) {
        setError('Não foi possível carregar as curiosidades. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  // Carrega curiosidades do AsyncStorage e inicia a busca na API
  useEffect(() => {
    AsyncStorage.getItem('@curiosidades_catolicas_cache')
      .then((cached) => {
        if (cached) {
          setCuriosities(cached);
          setLoading(false);
          // Inicia atualização silenciosa em background se já houver cache
          fetchCuriositiesFromApi(true);
        } else {
          fetchCuriositiesFromApi(false);
        }
      })
      .catch(() => {
        fetchCuriositiesFromApi(false);
      });
  }, []);

  const handleRetry = () => {
    fetchCuriositiesFromApi(false);
  };

  const showLoader = loading && !curiosities;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Indicador silencioso de atualização em background */}
      {isUpdating && (
        <View style={{ position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 10 }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* Conteúdo principal */}
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
            <MaterialCommunityIcons name="lightbulb-on" size={36} color="#FF9800" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Curiosidade Diária</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Fatos e Doutrina</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            Aprenda mais sobre a história, dogmas e curiosidades da fé católica.
          </Text>
        </Animated.View>

        {showLoader && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando curiosidades católicas...
            </Text>
          </View>
        )}

        {error && !curiosities && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error} style={{ marginBottom: spacing.sm }} />
            <Text style={[styles.errorTitle, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>Erro ao obter curiosidades</Text>
            <Text style={[styles.errorText, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>{error}</Text>
            <Pressable
              onPress={handleRetry}
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </Pressable>
          </View>
        )}

        {curiosities && (
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={{ width: '100%' }}
          >
            {renderMarkdownInPage(curiosities, colors, isDark)}
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
});
