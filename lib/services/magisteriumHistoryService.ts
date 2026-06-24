import AsyncStorage from '@react-native-async-storage/async-storage';
import { MagisteriumChat } from '../types/magisterium';

const CHATS_STORAGE_KEY = '@sanctus:magisterium_chats_v2';

export class MagisteriumHistoryService {
  private static instance: MagisteriumHistoryService;

  private constructor() {}

  static getInstance(): MagisteriumHistoryService {
    if (!MagisteriumHistoryService.instance) {
      MagisteriumHistoryService.instance = new MagisteriumHistoryService();
    }
    return MagisteriumHistoryService.instance;
  }

  /**
   * Obtém todos os chats salvos localmente, ordenados por data de atualização (mais recentes primeiro)
   */
  async getChats(): Promise<MagisteriumChat[]> {
    try {
      const stored = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
      if (!stored) return [];
      const chats = JSON.parse(stored) as MagisteriumChat[];
      return chats.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Erro ao obter histórico de chats:', error);
      return [];
    }
  }

  /**
   * Salva ou atualiza um chat específico
   */
  async saveChat(chat: MagisteriumChat): Promise<void> {
    try {
      const chats = await this.getChats();
      const index = chats.findIndex(c => c.id === chat.id);
      
      chat.updatedAt = Date.now();

      if (index !== -1) {
        chats[index] = chat;
      } else {
        chats.push(chat);
      }

      await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
      console.error('Erro ao salvar chat:', error);
      throw error;
    }
  }

  /**
   * Renomeia um chat específico
   */
  async renameChat(id: string, newTitle: string): Promise<void> {
    try {
      const chats = await this.getChats();
      const index = chats.findIndex(c => c.id === id);

      if (index !== -1) {
        chats[index].title = newTitle;
        chats[index].updatedAt = Date.now();
        await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
      }
    } catch (error) {
      console.error('Erro ao renomear chat:', error);
      throw error;
    }
  }

  /**
   * Exclui um chat específico
   */
  async deleteChat(id: string): Promise<void> {
    try {
      const chats = await this.getChats();
      const filtered = chats.filter(c => c.id !== id);
      await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
      throw error;
    }
  }

  /**
   * Limpa todo o histórico de chats
   */
  async clearAllChats(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CHATS_STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar todo histórico de chats:', error);
      throw error;
    }
  }
}

export const magisteriumHistoryService = MagisteriumHistoryService.getInstance();
