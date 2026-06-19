import { fetchSantoDoDia, SantoContentBlock, SantoDoDiaResponse } from '@/lib/santoDoDia';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, spacing, typography } from '@/lib/theme/tokens';
import { capitalizeWordsExceptDe, formatDatePT, monthIndexFromLabel, monthLabelPt } from '@/lib/utils';
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

export default function SantoScreen() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<SantoDoDiaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

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

  const formatSantoDatePT = (d: string | null, m: string | null, y: string | null): string => {
    if (!d || !m || !y) return '';
    const dayNum = parseInt(d, 10);
    const yearNum = parseInt(y, 10);
    const monthIdx = monthIndexFromLabel(m);
    if (isNaN(dayNum) || isNaN(yearNum) || monthIdx == null) return '';
    const dateObj = new Date(yearNum, monthIdx, dayNum);
    return formatDatePT(dateObj);
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
        <Ionicons name="alert-circle" size={64} color={colors.textSecondary} />
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
          style={styles.pageHeader}
        >
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {today?.title || 'Santo do Dia'}
          </Text>
          <View style={styles.dateButton}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {capitalizeWordsExceptDe(
                formatSantoDatePT(today?.day ?? null, today?.month ?? null, today?.year ?? null) || dateLabel
              )}
            </Text>
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
          {today?.content_blocks && today.content_blocks.length > 0 ? (
            <View style={styles.blocksContainer}>{renderBlocks(today.content_blocks)}</View>
          ) : (
            <Text style={[styles.bodyText, { color: colors.text }]}>
              {today?.full_text || 'Conteúdo indisponível.'}
            </Text>
          )}
        </Animated.View>

        {today?.outros_santos && today.outros_santos.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(350).delay(320)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Outros santos e beatos</Text>
            {today.outros_santos
              .filter(s => s.trim().length > 0)
              .slice(0, 15)
              .map((s, idx) => (
                <Text key={`${s}-${idx}`} style={[styles.otherItem, { color: colors.textSecondary }]}>
                  • {s}
                </Text>
              ))}
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
  errorTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  pageHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  mainTitle: {
    ...typography.h4,
    fontWeight: '600',
    textAlign: 'center',
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
  bodyText: {
    ...typography.body,
    lineHeight: 24,
    textAlign: 'justify',
  },
  blocksContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    textAlign: 'justify',
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
    textAlign: 'justify',
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
    textAlign: 'justify',
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  otherItem: {
    ...typography.body,
    lineHeight: 26,
    marginBottom: spacing.xs,
    textAlign: 'justify',
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
