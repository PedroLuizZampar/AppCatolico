import { fetchSantoDoDia, SantoContentBlock, SantoDoDiaResponse } from '@/lib/santoDoDia';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const monthLabelPt = (month: string | null | undefined): string | null => {
  if (!month) return null;
  const m = month
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 3);

  switch (m) {
    case 'JAN':
      return 'janeiro';
    case 'FEV':
      return 'fevereiro';
    case 'MAR':
      return 'março';
    case 'ABR':
      return 'abril';
    case 'MAI':
      return 'maio';
    case 'JUN':
      return 'junho';
    case 'JUL':
      return 'julho';
    case 'AGO':
      return 'agosto';
    case 'SET':
      return 'setembro';
    case 'OUT':
      return 'outubro';
    case 'NOV':
      return 'novembro';
    case 'DEZ':
      return 'dezembro';
    default:
      return month.trim();
  }
};

export default function SantoScreen() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<SantoDoDiaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  const monthIndexFromLabel = (label: string | null | undefined): number | null => {
    const monthName = monthLabelPt(label);
    if (!monthName) return null;
    const idx = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ].indexOf(monthName);
    return idx >= 0 ? idx : null;
  };

  const capitalizeWordsExceptDe = (value: string): string => {
    const parts = value.split(' ');
    return parts
      .map(part => {
        if (!part) return part;

        const m = /^([^\p{L}]*)((?:[\p{L}]+(?:-[\p{L}]+)*)+)([^\p{L}]*)$/u.exec(part);
        if (!m) return part;

        const leading = m[1] ?? '';
        const core = m[2] ?? '';
        const trailing = m[3] ?? '';

        if (core.toLowerCase() === 'de') return `${leading}de${trailing}`;

        const hyphenParts = core.split('-').map(p => (p ? p[0].toUpperCase() + p.slice(1) : p));
        return `${leading}${hyphenParts.join('-')}${trailing}`;
      })
      .join(' ');
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchSantoDoDia();
      setData(result);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível carregar o Santo do Dia.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = data?.today;

  useEffect(() => {
    if (!today?.image) {
      setImageAspectRatio(null);
      return;
    }

    let cancelled = false;
    Image.getSize(
      today.image,
      (w, h) => {
        if (cancelled) return;
        if (!w || !h) {
          setImageAspectRatio(null);
          return;
        }
        setImageAspectRatio(w / h);
      },
      () => {
        if (!cancelled) setImageAspectRatio(null);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [today?.image]);

  const renderBlocks = useCallback(
    (blocks: SantoContentBlock[] | null | undefined) => {
      if (!blocks || blocks.length === 0) return null;

      return blocks.map((block, idx) => {
        if (block.type === 'ul' || block.type === 'ol') {
          return (
            <View key={`blk-${block.type}-${idx}`} style={styles.blockList}>
              {block.items.map((item, liIdx) => (
                <View key={`li-${idx}-${liIdx}`} style={styles.listItemRow}>
                  <Text style={[styles.listBullet, { color: colors.primary }]}>{'•'}</Text>
                  <Text style={[styles.listItemText, { color: colors.text }]}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }

        const baseTextStyle =
          block.type === 'h2'
            ? styles.blockH2
            : block.type === 'h3'
              ? styles.blockH3
              : block.type === 'h4'
                ? styles.blockH4
                : block.type === 'blockquote'
                  ? styles.blockQuoteText
                  : styles.blockP;

        const textColor =
          block.type === 'h4'
            ? colors.textSecondary
            : colors.text;

        if (block.type === 'blockquote') {
          return (
            <View
              key={`blk-${block.type}-${idx}`}
              style={[
                styles.blockQuote,
                {
                  borderLeftColor: colors.accent,
                  backgroundColor: colors.surfaceLight,
                },
              ]}
            >
              <Text style={[baseTextStyle, { color: textColor }]}>{'text' in block ? block.text : ''}</Text>
            </View>
          );
        }

        return (
          <Text key={`blk-${block.type}-${idx}`} style={[baseTextStyle, { color: textColor }]}>
            {'text' in block ? block.text : ''}
          </Text>
        );
      });
    },
    [colors]
  );

  const dateLabel = useMemo(() => {
    if (!today) return '';
    const d = today.day?.trim();
    const m = monthLabelPt(today.month);
    const y = today.year?.trim();
    if (d && m && y) return `${d} de ${m} de ${y}`;
    return [d, today.month, y].filter(Boolean).join(' ');
  }, [today]);

  const formatDatePT = (d: string | null, m: string | null, y: string | null): string => {
    if (!d || !m || !y) return '';
    const dayNum = parseInt(d, 10);
    const yearNum = parseInt(y, 10);
    const monthIdx = monthIndexFromLabel(m);
    if (isNaN(dayNum) || isNaN(yearNum) || monthIdx == null) return '';
    const dateObj = new Date(yearNum, monthIdx, dayNum);
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando Santo do Dia...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Erro ao carregar Santo do Dia
        </Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error || 'Dados não encontrados.'}
        </Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setLoading(true);
            load();
          }}
        >
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.lg + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.headerCard, shadows.md, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.headerTextContainer}>
            <Text style={[styles.mainTitle, { color: colors.text }]} numberOfLines={2}>
              {today?.title || 'Santo do Dia'}
            </Text>
            <View style={styles.dateButton}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {capitalizeWordsExceptDe(
                  formatDatePT(today?.day ?? null, today?.month ?? null, today?.year ?? null) || dateLabel
                )}
              </Text>
            </View>
          </View>
        </Animated.View>

        {today?.image ? (
          <Animated.View entering={FadeInDown.duration(350).delay(200)}>
            <Image
              source={{ uri: today.image }}
              style={[
                styles.image,
                { borderColor: colors.border },
                imageAspectRatio ? { aspectRatio: imageAspectRatio } : { height: 200 },
              ]}
              resizeMode="cover"
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(350).delay(260)}>
          <View style={[styles.textCard, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {today?.content_blocks && today.content_blocks.length > 0 ? (
              <View style={styles.blocksContainer}>{renderBlocks(today.content_blocks)}</View>
            ) : (
              <Text style={[styles.bodyText, { color: colors.text }]}>
                {today?.full_text || 'Conteúdo indisponível.'}
              </Text>
            )}
          </View>
        </Animated.View>

        {today?.outros_santos && today.outros_santos.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(350).delay(320)}>
            <View style={[styles.otherCard, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Outros santos e beatos</Text>
              {today.outros_santos
                .filter(s => s.trim().length > 0)
                .slice(0, 15)
                .map((s, idx) => (
                  <Text key={`${s}-${idx}`} style={[styles.otherItem, { color: colors.textSecondary }]}>
                    • {s}
                  </Text>
                ))}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  errorHint: {
    ...typography.small,
    marginTop: spacing.md,
  },
  headerCard: {
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  mainTitle: {
    ...typography.h4,
    fontWeight: '600',
  },
  dateText: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  image: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  textCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  bodyText: {
    ...typography.body,
    lineHeight: 24,
  },
  blocksContainer: {
    gap: spacing.md,
  },
  blockH2: {
    ...typography.h2,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  blockH3: {
    ...typography.h3,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  blockH4: {
    ...typography.body,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  blockP: {
    ...typography.body,
    lineHeight: 26,
  },
  blockQuote: {
    borderLeftWidth: 4,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.sm,
  },
  blockQuoteText: {
    ...typography.body,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  blockList: {
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  listBullet: {
    ...typography.body,
    width: 20,
    lineHeight: 26,
  },
  listItemText: {
    ...typography.body,
    flex: 1,
    lineHeight: 26,
  },
  otherCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  otherItem: {
    ...typography.body,
    lineHeight: 26,
    marginBottom: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.lg,
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
