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
  Animated,
} from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedReanimated, {
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius } from '@/lib/theme/tokens';
import { magisteriumService } from '@/lib/services/magisteriumService';
import { magisteriumHistoryService } from '@/lib/services/magisteriumHistoryService';
import { Message, Citation, MessageUI, MagisteriumChat } from '@/lib/types/magisterium';
import { copyToClipboard } from '@/lib/webShare';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Mensagem inicial do assistente
const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Salve Maria! Sou o Assistente Católico do Sanctus. Utilizando a tecnologia do Magisterium AI, posso responder suas dúvidas sobre a fé, moral, doutrina, Bíblia e tradição da Igreja Católica. Como posso ajudar você hoje?',
};

export default function ChatScreen() {
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const [chats, setChats] = useState<MagisteriumChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Drawer & Renomear
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const isInitializing = useRef(false);

  const drawerWidth = SCREEN_WIDTH * 0.75;
  const drawerTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const [isRenameVisible, setIsRenameVisible] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const flatListRef = useRef<FlatList>(null);

  const toggleDrawer = useCallback((open: boolean) => {
    setIsDrawerVisible(open);
    Animated.timing(drawerAnimation, {
      toValue: open ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [drawerAnimation]);

  // Cria um novo chat limpo
  const handleCreateNewChat = useCallback(async (currentChatsList?: MagisteriumChat[]) => {
    const list = currentChatsList || chats;
    const newId = `chat-${Date.now()}`;
    const newChat: MagisteriumChat = {
      id: newId,
      title: 'Nova Conversa',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [{ ...INITIAL_MESSAGE, id: `welcome-msg-${Date.now()}` }],
    };

    try {
      await magisteriumHistoryService.saveChat(newChat);
      const updatedList = [newChat, ...list];
      setChats(updatedList);
      setActiveChatId(newId);
      setMessages(newChat.messages);
      toggleDrawer(false);
    } catch (error) {
      console.error('Erro ao criar novo chat:', error);
    }
  }, [chats, toggleDrawer]);

  // Carrega todos os chats locais e define o ativo
  const loadChats = useCallback(async (selectChatId?: string) => {
    if (isInitializing.current) return;
    isInitializing.current = true;
    try {
      const storedChats = await magisteriumHistoryService.getChats();
      setChats(storedChats);
      
      if (storedChats.length > 0) {
        // Seleciona o chat indicado ou o mais recente (primeiro da lista)
        const targetChat = selectChatId 
          ? storedChats.find(c => c.id === selectChatId) || storedChats[0]
          : storedChats[0];
          
        setActiveChatId(targetChat.id);
        setMessages(targetChat.messages);
      } else {
        // Sem histórico: cria o primeiro chat automático
        await handleCreateNewChat(storedChats);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de chats:', error);
      // Fallback básico em memória
      setMessages([{ ...INITIAL_MESSAGE, id: 'welcome-msg' }]);
    } finally {
      isInitializing.current = false;
    }
  }, [handleCreateNewChat]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);


  // Exclui um chat do histórico
  const handleDeleteChat = (chatId: string) => {
    Alert.alert(
      'Apagar Conversa',
      'Tem certeza de que deseja excluir permanentemente esta conversa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await magisteriumHistoryService.deleteChat(chatId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              if (chatId === activeChatId) {
                const remaining = chats.filter(c => c.id !== chatId);
                if (remaining.length > 0) {
                  setChats(remaining);
                  setActiveChatId(remaining[0].id);
                  setMessages(remaining[0].messages);
                  toggleDrawer(false);
                } else {
                  await handleCreateNewChat([]);
                }
              } else {
                setChats(prev => prev.filter(c => c.id !== chatId));
              }
            } catch (error) {
              console.error('Erro ao deletar chat:', error);
            }
          }
        }
      ]
    );
  };

  const startRenameChat = (chatId: string, currentTitle: string) => {
    setRenameTargetId(chatId);
    setRenameText(currentTitle);
    setIsRenameVisible(true);
  };

  const handleConfirmRename = async () => {
    if (!renameTargetId || !renameText.trim()) return;
    try {
      await magisteriumHistoryService.renameChat(renameTargetId, renameText.trim());
      setIsRenameVisible(false);
      setRenameTargetId(null);
      setRenameText('');
      
      const updatedChats = await magisteriumHistoryService.getChats();
      setChats(updatedChats);
    } catch (error) {
      console.error('Erro ao renomear chat:', error);
    }
  };

  // Enviar mensagem
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !activeChatId) return;

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
      const apiHistory: Message[] = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await magisteriumService.sendMessage(apiHistory);

      const choice = response.choices?.[0];
      let assistantText = choice?.message?.content || '';

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

      // Salva no AsyncStorage local usando o serviço histórico
      const currentChat = chats.find(c => c.id === activeChatId);
      if (currentChat) {
        const isDefaultTitle = currentChat.title === 'Nova Conversa';
        const updatedChat: MagisteriumChat = {
          ...currentChat,
          title: isDefaultTitle ? (userMessage.content.length > 30 ? userMessage.content.substring(0, 27) + '...' : userMessage.content) : currentChat.title,
          messages: finalMessages,
        };
        await magisteriumHistoryService.saveChat(updatedChat);
        
        const updatedList = await magisteriumHistoryService.getChats();
        setChats(updatedList);
      }

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
          headerLeft: () => (
            <Pressable
              onPress={() => toggleDrawer(true)}
              hitSlop={10}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                paddingLeft: 16,
              })}
            >
              <Ionicons name="menu" size={24} color={colors.text} />
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

      {/* Drawer Retrátil Esquerdo */}
      {isDrawerVisible && (
        <View style={StyleSheet.absoluteFillObject}>
          {/* Overlay transparente/translúcido de fechamento */}
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }]}
            onPress={() => toggleDrawer(false)}
          />
          
          <Animated.View
            style={[
              styles.drawerContainer,
              {
                backgroundColor: colors.surface,
                borderRightColor: colors.border,
                transform: [{ translateX: drawerTranslateX }],
                width: SCREEN_WIDTH * 0.75,
              }
            ]}
          >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={styles.drawerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.drawerTitle, { color: colors.text }]}>Histórico</Text>
                </View>
                <Pressable onPress={() => toggleDrawer(false)} hitSlop={10}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.newChatButton,
                  { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => handleCreateNewChat()}
              >
                <Ionicons name="add" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.newChatButtonText, { color: colors.primary }]}>Nova Conversa</Text>
              </Pressable>

              <ScrollView style={{ flex: 1, marginTop: spacing.md }} showsVerticalScrollIndicator={true}>
                {chats.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: colors.textMuted, marginVertical: spacing.lg, fontSize: 13 }}>
                    Nenhuma conversa encontrada.
                  </Text>
                ) : (
                  chats.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    return (
                      <Pressable
                        key={chat.id}
                        style={[
                          styles.chatHistoryItem,
                          { borderColor: colors.border },
                          isActive && { backgroundColor: colors.primary + '08', borderColor: colors.primary }
                        ]}
                        onPress={() => {
                          setActiveChatId(chat.id);
                          setMessages(chat.messages);
                          toggleDrawer(false);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                          <Text
                            style={[
                              styles.chatHistoryItemTitle,
                              { color: colors.text },
                              isActive && { fontWeight: 'bold', color: colors.primary }
                            ]}
                            numberOfLines={1}
                          >
                            {chat.title}
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                            {new Date(chat.updatedAt).toLocaleDateString('pt-BR')}
                          </Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                          <Pressable
                            style={styles.chatHistoryActionButton}
                            onPress={() => startRenameChat(chat.id, chat.title)}
                            hitSlop={8}
                          >
                            <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                          </Pressable>
                          <Pressable
                            style={styles.chatHistoryActionButton}
                            onPress={() => handleDeleteChat(chat.id)}
                            hitSlop={8}
                          >
                            <Ionicons name="trash" size={14} color={colors.error} />
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      )}

      {/* Modal de Renomear Chat */}
      <Modal
        visible={isRenameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay, justifyContent: 'center', paddingHorizontal: spacing.lg }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsRenameVisible(false)} />
          <View style={[styles.renameContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.renameTitle, { color: colors.text }]}>Renomear Conversa</Text>
            
            <TextInput
              style={[styles.renameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Digite o novo título..."
              placeholderTextColor={colors.textMuted}
              maxLength={40}
              autoFocus
            />

            <View style={styles.renameActionsRow}>
              <Pressable
                style={[styles.renameButton, { backgroundColor: colors.surfaceLight }]}
                onPress={() => setIsRenameVisible(false)}
              >
                <Text style={[styles.renameButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.renameButton, { backgroundColor: colors.primary }]}
                onPress={handleConfirmRename}
              >
                <Text style={[styles.renameButtonText, { color: '#FFFFFF', fontWeight: 'bold' }]}>Confirmar</Text>
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
  newChatButton: {
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  newChatButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  chatHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    justifyContent: 'space-between',
  },
  chatHistoryItemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  chatHistoryActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  renameTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  renameInput: {
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    fontSize: 15,
  },
  renameActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  renameButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  renameButtonText: {
    fontSize: 14,
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
    zIndex: 9999,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    marginBottom: spacing.xs,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
