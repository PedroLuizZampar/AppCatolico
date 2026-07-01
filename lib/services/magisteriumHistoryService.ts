import { MagisteriumChat } from '../types/magisterium';
import { 
  getLocalChats, 
  saveLocalChat, 
  renameLocalChat, 
  deleteLocalChat, 
  clearAllLocalChats 
} from '../sqlite/sqliteDatabase';

/**
 * Serviço de histórico de chats do Magisterium AI usando SQLite local indexado por usuário.
 */
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
   * Obtém todos os chats salvos localmente do usuário
   */
  async getChats(userId: string): Promise<MagisteriumChat[]> {
    return getLocalChats(userId);
  }

  /**
   * Salva ou atualiza um chat específico do usuário
   */
  async saveChat(userId: string, chat: MagisteriumChat): Promise<void> {
    return saveLocalChat(userId, chat);
  }

  /**
   * Renomeia um chat específico do usuário
   */
  async renameChat(userId: string, id: string, newTitle: string): Promise<void> {
    return renameLocalChat(userId, id, newTitle);
  }

  /**
   * Exclui um chat específico do usuário
   */
  async deleteChat(userId: string, id: string): Promise<void> {
    return deleteLocalChat(userId, id);
  }

  /**
   * Limpa todo o histórico de chats do usuário
   */
  async clearAllChats(userId: string): Promise<void> {
    return clearAllLocalChats(userId);
  }
}

export const magisteriumHistoryService = MagisteriumHistoryService.getInstance();
