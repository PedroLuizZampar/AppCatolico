import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, getColors, shadows, spacing, typography } from '@/lib/theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTodayMisteriosStartId } from '@/lib/rosario';

export default function HomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  const formattedDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    const dateStr = new Date().toLocaleDateString('pt-BR', options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }, []);

  const menuItems = [
    {
      title: 'Liturgia Diária',
      subtitle: 'Leituras do dia',
      icon: 'calendar', // Ícone de calendário com linhas de texto
      color: '#4CAF50', // Verde
      route: '/liturgia',
      library: 'Ionicons',
    },
    {
      title: 'Evangelho Meditado',
      subtitle: 'Reflexão diária',
      icon: 'book-open-variant', // Livro aberto
      color: '#894e93', // Roxo
      route: '/meditacao-evangelho',
      library: 'MaterialCommunityIcons',
    },
    {
      title: 'Santo do Dia',
      subtitle: 'História e virtudes',
      icon: 'candle',
      color: '#E91E63', // Rosa
      route: '/santo',
      library: 'MaterialCommunityIcons',
    },
    {
      title: 'Curiosidade Diária',
      subtitle: 'Fatos e Doutrina',
      icon: 'lightbulb-on', // Lâmpada acesa estilizada
      color: '#FF9800', // Laranja
      route: '/curiosidades',
      library: 'MaterialCommunityIcons',
    },
    {
      title: 'Bíblia Sagrada',
      subtitle: 'Palavra de Deus',
      icon: 'book-cross',
      color: '#2196F3', // Azul
      route: '/biblia',
      library: 'MaterialCommunityIcons',
    },
    {
      title: 'Biblioteca',
      subtitle: 'Livros e Catecismo',
      icon: 'bookshelf', // Estante cheia de livros
      color: '#795548', // Marrom
      route: '/livros',
      library: 'MaterialCommunityIcons',
    },
    {
      title: 'Frases de Santos',
      subtitle: 'Pensamentos',
      icon: 'format-quote-close', // Aspas de citação/frases
      color: '#607D8B', // Azul Acinzentado
      route: '/livro/frases-de-santos',
      library: 'MaterialCommunityIcons',
    },
    {
      title: 'Rezar Terço',
      subtitle: 'Terço do dia',
      icon: 'hands-pray',
      color: '#c6a656',
      route: `/livro/misterios-terco/capitulo/${getTodayMisteriosStartId()}?fluxo=intro&tipo=terco`,
      library: 'MaterialCommunityIcons',
    },
    {
      title: 'Santo Rosário',
      subtitle: 'Mistérios do Terço',
      icon: 'rose',
      color: '#D32F2F',
      route: '/livro/misterios-terco',
      library: 'Ionicons',
    },
    {
      title: 'Via Sacra',
      subtitle: 'Meditação da Paixão',
      icon: 'cross', // A própria cruz de Cristo para a Via Crucis
      color: '#ed6b43', // Laranja Escuro
      route: '/livro/via-sacra',
      library: 'MaterialCommunityIcons',
    },
    {
      title: 'Magisterium',
      subtitle: 'IA de Doutrina e Magistério',
      icon: 'comment-question',
      color: '#4A7BA7',
      route: '/chat',
      library: 'MaterialCommunityIcons',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.lg + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho simplificado com data e favorito */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.header}
        >
          <View style={styles.dateContainer}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>
          </View>
          <Pressable
            style={[styles.iconButton, {
              backgroundColor: colors.surface,
              borderColor: colors.border
            }]}
            onPress={() => router.push('/favoritos')}
          >
            <Ionicons name="heart" size={20} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Card Destaque: Meditação Rápida */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Pressable
            style={({ pressed }) => [
              styles.meditationCard,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            onPress={() => router.push('/meditacao')}
          >
            <View style={styles.meditationContent}>
              <View style={styles.meditationIcon}>
                <MaterialCommunityIcons name="comment-text" size={24} color="#fff" />
              </View>
              <View style={styles.meditationText}>
                <Text style={styles.meditationTitle}>Meditação Rápida</Text>
                <Text style={styles.meditationSubtitle}>
                  Um ponto de São Josemaria Escrivá ou uma frase de santo para inspirar o seu dia.
                </Text>
              </View>
              <View style={styles.meditationArrow}>
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {/* Grid de Funcionalidades */}
        <View style={styles.gridContainer}>
          {menuItems.map((item, index) => (
            <Animated.View
              key={item.title}
              entering={FadeInDown.duration(400).delay(250 + index * 50)}
              style={styles.gridItem}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  shadows.sm,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                  {item.library === 'MaterialCommunityIcons' ? (
                    <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                  ) : (
                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                  )}
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2} textBreakStrategy="simple">
                  {item.title}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitleContainer: {
    flex: 1,
  },
  welcomeText: {
    ...typography.small,
    fontWeight: '500',
  },
  title: {
    ...typography.h2,
    fontWeight: 'bold',
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    ...typography.body,
    fontWeight: '500',
  },
  meditationCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  meditationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  meditationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  meditationEmoji: {
    fontSize: 24,
  },
  meditationText: {
    flex: 1,
    gap: 2,
  },
  meditationTitle: {
    ...typography.bodyLarge,
    fontWeight: 'bold',
    color: '#fff',
  },
  meditationSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  meditationArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  gridItem: {
    width: '47%',
    aspectRatio: 1,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardSubtitle: {
    ...typography.caption,
    marginTop: 2,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
});
