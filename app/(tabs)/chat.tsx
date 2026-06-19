import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius } from '@/lib/theme/tokens';
import { magisteriumService } from '@/lib/services/magisteriumService';
import { Message, Citation } from '@/lib/types/magisterium';
import { copyToClipboard, showNotification } from '@/lib/webShare';

const CHAT_STORAGE_KEY = '@sanctus:magisterium_chat_history_v1';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mensagem inicial do assistente
const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Salve Maria! Sou o Assistente Católico do Sanctus. Utilizando a tecnologia do Magisterium AI, posso responder suas dúvidas sobre a fé, moral, doutrina, Bíblia e tradição da Igreja Católica. Como posso ajudar você hoje?',
};

interface MessageUI extends Message {
  id: string;
  citations?: Citation[];
  related_questions?: string[];
}

export default function ChatScreen() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Salva no AsyncStorage quando o histórico muda
  const saveChatHistory = useCallback(async (updatedMessages: MessageUI[]) => {
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Erro ao salvar histórico do chat:', error);
    }
  }, []);

  const loadChatHistory = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MessageUI[];
        setMessages(parsed);
      } else {
        // Inicializa com a mensagem de boas-vindas
        const initialList: MessageUI[] = [
          {
            ...INITIAL_MESSAGE,
            id: 'welcome-msg',
          },
        ];
        setMessages(initialList);
        saveChatHistory(initialList);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico do chat:', error);
      // Fallback
      setMessages([{ ...INITIAL_MESSAGE, id: 'welcome-msg' }]);
    }
  }, [saveChatHistory]);

  // Carrega histórico inicial
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Limpa histórico
  const handleClearChat = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Limpar Conversa',
      'Deseja apagar todo o histórico de mensagens?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              const resetList: MessageUI[] = [
                {
                  ...INITIAL_MESSAGE,
                  id: `welcome-msg-${Date.now()}`,
                },
              ];
              setMessages(resetList);
              await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(resetList));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Erro ao limpar histórico:', error);
            }
          },
        },
      ]
    );
  };

  // Enviar mensagem
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Feedback tátil
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMessage: MessageUI = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    // Rola para o fim
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Filtra o histórico para enviar à API (somente role e content)
      const apiHistory: Message[] = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await magisteriumService.sendMessage(apiHistory);

      const choice = response.choices?.[0];
      let assistantText = choice?.message?.content || '';

      // Verifica se houve bloqueio por moderação
      if (choice?.finish_reason === 'content_filter' && !assistantText) {
        assistantText = 'Desculpe, mas essa pergunta está fora do escopo teológico, bíblico ou de moral da Igreja Católica. Por favor, faça uma pergunta sobre a fé católica.';
      }

      const assistantMessage: MessageUI = {
        id: `msg-${response.id || Date.now()}-assistant`,
        role: 'assistant',
        content: assistantText,
        citations: response.citations,
        related_questions: response.related_questions,
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      const errorMessage: MessageUI = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Desculpe, ocorreu um erro de conexão. Verifique sua internet ou tente novamente mais tarde.\n\nDetalhe: ${error.message || 'Erro desconhecido'}`,
      };

      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Envia uma pergunta recomendada (pill)
  const handleSendRelatedQuestion = (question: string) => {
    handleSendMessage(question);
  };

  // Converte texto comum com markdown (**negrito**, *itálico*) e citações [1]
  const parseMarkdownAndCitations = (text: string, style: any, citations?: Citation[]) => {
    // 1. Divide primeiro por markdown (**...** ou *...*)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return parts.map((part, index) => {
      let isBold = false;
      let isItalic = false;
      let cleanPart = part;

      if (part.startsWith('**') && part.endsWith('**')) {
        isBold = true;
        cleanPart = part.slice(2, -2);
      } else if (part.startsWith('*') && part.endsWith('*')) {
        isItalic = true;
        cleanPart = part.slice(1, -1);
      }

      const textStyle = [
        style,
        isBold && { fontWeight: 'bold' as const },
        isItalic && { fontStyle: 'italic' as const },
      ];

      // 2. Divide cada trecho limpo para buscar as citações [1] e [^1]
      const subParts = cleanPart.split(/(\[\^?\d+\])/g);

      return (
        <Text key={index}>
          {subParts.map((subPart, subIndex) => {
            const match = subPart.match(/\[\^?(\d+)\]/);
            if (match) {
              const docIndex = parseInt(match[1], 10) - 1;
              const citation = citations?.find(c => c.document_index === docIndex) || citations?.[docIndex];

              if (citation) {
                return (
                  <Text
                    key={subIndex}
                    style={{
                      color: colors.primary,
                      fontSize: 10,
                      fontWeight: 'bold',
                      verticalAlign: 'top',
                      lineHeight: 14,
                    }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCitation(citation);
                    }}
                  >
                    {`[${match[1]}]`}
                  </Text>
                );
              }
            }
            return <Text key={subIndex} style={textStyle}>{subPart}</Text>;
          })}
        </Text>
      );
    });
  };

  // Renderiza a mensagem inteira processando as linhas do Markdown
  const renderMessageContent = (text: string, citations?: Citation[]) => {
    if (!text) return null;

    const lines = text.split('\n');

    return (
      <View style={{ gap: spacing.xs }}>
        {lines.map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <View key={index} style={{ height: spacing.xs }} />;
          }

          // Títulos
          if (trimmed.startsWith('# ')) {
            return (
              <Text key={index} style={[typography.h3, { color: colors.text, marginTop: spacing.sm, fontWeight: 'bold' }]}>
                {parseMarkdownAndCitations(trimmed.slice(2), { color: colors.text }, citations)}
              </Text>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <Text key={index} style={[typography.h4, { color: colors.text, marginTop: spacing.xs, fontWeight: 'bold' }]}>
                {parseMarkdownAndCitations(trimmed.slice(3), { color: colors.text }, citations)}
              </Text>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <Text key={index} style={[typography.bodyLarge, { color: colors.text, marginTop: spacing.xs, fontWeight: 'bold' }]}>
                {parseMarkdownAndCitations(trimmed.slice(4), { color: colors.text }, citations)}
              </Text>
            );
          }

          // Listas
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            return (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: spacing.sm, marginVertical: 2 }}>
                <Text style={[typography.body, { color: colors.primary, marginRight: 6 }]}>•</Text>
                <Text style={{ flex: 1 }}>
                  {parseMarkdownAndCitations(trimmed.slice(2), { ...typography.body, color: colors.text }, citations)}
                </Text>
              </View>
            );
          }

          // Parágrafo Normal
          return (
            <Text key={index} style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
              {parseMarkdownAndCitations(trimmed, { ...typography.body, color: colors.text }, citations)}
            </Text>
          );
        })}
      </View>
    );
  };

  // Renderiza cada mensagem no chat
  const renderItem = ({ item }: { item: MessageUI }) => {
    const isUser = item.role === 'user';

    return (
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[
          styles.messageRow,
          isUser ? styles.userRow : styles.assistantRow,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <MaterialCommunityIcons name="cross" size={16} color={colors.primary} />
          </View>
        )}

        <View style={styles.messageBubbleContainer}>
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
            ]}
          >
            {isUser ? (
              <Text style={[styles.messageText, { color: '#FFFFFF' }]}>{item.content}</Text>
            ) : (
              renderMessageContent(item.content, item.citations)
            )}
          </View>

          {/* Cards de Referência Bibliográfica */}
          {!isUser && item.citations && item.citations.length > 0 && (
            <View style={styles.citationsMiniContainer}>
              <Text style={[styles.citationsTitle, { color: colors.textMuted }]}>
                Referências ({item.citations.length}):
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.citationsScrollContent}
              >
                {item.citations.map((citation, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.citationMiniCard,
                      {
                        backgroundColor: colors.surfaceLight,
                        borderColor: colors.border,
                      }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCitation(citation);
                    }}
                  >
                    <Ionicons name="document-text" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.citationMiniText, { color: colors.textSecondary }]} numberOfLines={1}>
                      [{index + 1}] {citation.document_title} {citation.document_reference ? `(${citation.document_reference})` : ''}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const lastMessage = messages[messages.length - 1];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Tabs.Screen
        options={{
          headerTitle: 'Magisterium AI',
          tabBarLabel: 'Magisterium',
          headerRight: () => (
            <Pressable
              onPress={handleClearChat}
              hitSlop={10}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                paddingHorizontal: 8,
              })}
            >
              <Ionicons name="trash" size={20} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
        style={styles.keyboardView}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.lg }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingBubbleRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                  <MaterialCommunityIcons name="cross" size={16} color={colors.primary} />
                </View>
                <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.messageText, { color: colors.textMuted, fontSize: 14 }]}>
                    Consultando Magistério...
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Perguntas Recomendadas (Pills) */}
        {!isLoading && lastMessage && lastMessage.role === 'assistant' && lastMessage.related_questions && lastMessage.related_questions.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.relatedSection}>
            <Text style={[styles.relatedHeading, { color: colors.textMuted }]}>Perguntas Relacionadas:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedScrollContainer}
            >
              {lastMessage.related_questions.map((question, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.relatedPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => handleSendRelatedQuestion(question)}
                >
                  <Ionicons name="help-circle" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.relatedPillText, { color: colors.textSecondary }]}>{question}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Input da Mensagem */}
        <View style={[styles.inputArea, { borderTopColor: colors.divider, backgroundColor: colors.background }]}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }
            ]}
            placeholder="Pergunte sobre Doutrina, Bíblia, Santos..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            editable={!isLoading}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() && !isLoading ? colors.primary : colors.surfaceLight,
              }
            ]}
            onPress={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() && !isLoading ? '#FFFFFF' : colors.textMuted}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Modal / Bottom Sheet da Citação Teológica */}
      <Modal
        visible={selectedCitation !== null}
        transparent
        animationType="none"
        onRequestClose={() => setSelectedCitation(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          {/* Background interativo para fechar ao tocar fora */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedCitation(null)}
          />

          {/* Painel do Modal (View comum, evita aninhamento de ScrollView dentro de Pressables) */}
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Handle decorativo do Bottom Sheet */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="book" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.modalDocTitle, { color: colors.text }]} numberOfLines={2}>
                  {selectedCitation?.document_title}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedCitation(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {selectedCitation?.document_author && (
              <Text style={[styles.modalDocAuthor, { color: colors.textSecondary }]}>
                Autor: {selectedCitation.document_author}
              </Text>
            )}

            {selectedCitation?.document_reference && (
              <View style={[styles.modalRefBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.modalRefText, { color: colors.primary }]}>
                  Referência: {selectedCitation.document_reference}
                </Text>
              </View>
            )}

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
              {selectedCitation?.cited_text_heading && (
                <Text style={[styles.modalHeading, { color: colors.text }]}>
                  {selectedCitation.cited_text_heading}
                </Text>
              )}

              <View style={[styles.modalQuoteBlock, { borderLeftColor: colors.primary, backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.modalQuoteText, { color: colors.textSecondary }]}>
                  “{selectedCitation?.cited_text}”
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalActionButton, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                onPress={async () => {
                  if (selectedCitation) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const textToCopy = `"${selectedCitation.cited_text}"\n\n— ${selectedCitation.document_title}${selectedCitation.document_reference ? `, ${selectedCitation.document_reference}` : ''}`;
                    await copyToClipboard(textToCopy);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }
                }}
              >
                <Ionicons name={isCopied ? "checkmark" : "copy"} size={18} color={isCopied ? colors.success : colors.text} style={{ marginRight: 8 }} />
                <Text style={[styles.modalActionButtonText, { color: isCopied ? colors.success : colors.text, fontWeight: isCopied ? 'bold' : '600' }]}>
                  {isCopied ? 'Copiado' : 'Copiar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginVertical: 2,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  loadingBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 4,
  },
  messageBubbleContainer: {
    flex: 1,
    maxWidth: '85%',
  },
  bubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  userBubble: {
    borderTopRightRadius: 2,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  assistantBubble: {
    borderTopLeftRadius: 2,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  citationInlineBadge: {
    fontWeight: 'bold',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  // Referências no rodapé do balão
  citationsMiniContainer: {
    marginTop: spacing.xs,
    paddingLeft: 2,
  },
  citationsTitle: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: 4,
  },
  citationsScrollContent: {
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  citationMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  citationMiniText: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 200,
  },
  // Perguntas Relacionadas
  relatedSection: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  relatedHeading: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  relatedScrollContainer: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  relatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
    borderWidth: 1,
  },
  relatedPillText: {
    ...typography.small,
    fontWeight: '500',
  },
  // Área do Input
  inputArea: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal / Bottom Sheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalClickPreventer: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + spacing.sm,
    paddingTop: spacing.sm,
    maxHeight: SCREEN_HEIGHT * 0.8,
    width: '100%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.md,
  },
  modalDocTitle: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 2,
  },
  modalDocAuthor: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  modalRefBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  modalRefText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: SCREEN_HEIGHT * 0.45,
    marginBottom: spacing.md,
  },
  modalHeading: {
    ...typography.body,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  modalQuoteBlock: {
    borderLeftWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  modalQuoteText: {
    ...typography.body,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActionButton: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
