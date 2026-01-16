import { borderRadius, spacing, typography } from '@/lib/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

interface MeditationShareCardProps {
  text: string;
  number: number;
  chapterNumber: number;
  chapterName: string;
  bookTitle: string;
  bookIcon: string;
  bookAuthor: string;
  bookColor: string;
  date: string;
  hideChapterNumber?: boolean;
}

export const MeditationShareCard = React.forwardRef<View, MeditationShareCardProps>(
  (
    {
      text,
      number,
      chapterNumber,
      chapterName,
      bookTitle,
      bookIcon,
      bookAuthor,
      bookColor,
      date,
      hideChapterNumber,
    },
    ref
  ) => {
    return (
      <View ref={ref} collapsable={false} style={styles.container}>
        <LinearGradient
          colors={['#FFFFFF', '#F5F5F5']}
          style={styles.gradient}
        >
          {/* Header com logo/marca */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: bookColor + '20' }]}>
              <Text style={styles.bookIcon}>{bookIcon}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.bookTitle}>{bookTitle}</Text>
              <Text style={styles.bookAuthor}>{bookAuthor}</Text>
            </View>
          </View>

          {/* Linha decorativa */}
          <View style={[styles.divider, { backgroundColor: bookColor }]} />

          {/* Referência */}
          <View style={styles.referenceContainer}>
            <Text style={[styles.chapterText, { color: bookColor }]}>
              {hideChapterNumber ? chapterName : `Capítulo ${chapterNumber} · ${chapterName}`}
            </Text>
            <View style={[styles.paragraphBadge, { backgroundColor: bookColor }]}>
              <Text style={styles.paragraphNumber}>#{number}</Text>
            </View>
          </View>

          {/* Texto da Meditação */}
          <View style={styles.textContainer}>
            <Text style={styles.quoteIcon}>{'"'}</Text>
            <Text style={styles.meditationText}>{text}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={[styles.decorationBar, { backgroundColor: bookColor }]} />
            <Text style={styles.dateText}>{date}</Text>
            <Text style={styles.appName}>Sanctus</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
);

MeditationShareCard.displayName = 'MeditationShareCard';

const { width } = Dimensions.get('window');
const cardWidth = Math.min(width - 40, 600);

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    padding: spacing.xl * 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookIcon: {
    fontSize: 40,
  },
  headerInfo: {
    flex: 1,
  },
  bookTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: '#1A1A1A',
    fontSize: 20,
  },
  bookAuthor: {
    ...typography.small,
    color: '#666',
    marginTop: spacing.xs,
    fontSize: 14,
  },
  divider: {
    height: 3,
    width: 80,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  referenceContainer: {
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  chapterText: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  paragraphBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  paragraphNumber: {
    ...typography.small,
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  textContainer: {
    marginBottom: spacing.xl,
    position: 'relative',
  },
  quoteIcon: {
    fontSize: 80,
    color: '#E0E0E0',
    fontWeight: 'bold',
    position: 'absolute',
    top: -20,
    left: -10,
    lineHeight: 80,
    fontFamily: 'Georgia',
  },
  meditationText: {
    ...typography.bodyLarge,
    fontSize: 17,
    lineHeight: 30,
    color: '#2A2A2A',
    textAlign: 'justify',
    paddingTop: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  decorationBar: {
    height: 3,
    width: 60,
    borderRadius: 2,
  },
  dateText: {
    ...typography.small,
    color: '#888',
    fontSize: 13,
    fontStyle: 'italic',
  },
  appName: {
    ...typography.small,
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
