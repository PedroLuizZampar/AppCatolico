import { TextHighlight } from '../types';
import { 
  getLocalHighlights as getSqliteHighlights, 
  addLocalHighlight, 
  removeLocalHighlight, 
  updateLocalHighlightsForChapter 
} from '../sqlite/sqliteDatabase';

/**
 * Serviço de gerenciamento de grifos do usuário com suporte a SQLite local.
 */
export class HighlightService {
  private static instance: HighlightService;

  private constructor() {}

  static getInstance(): HighlightService {
    if (!HighlightService.instance) {
      HighlightService.instance = new HighlightService();
    }
    return HighlightService.instance;
  }

  /**
   * Buscar todos os grifos locais salvos do usuário
   */
  async getHighlights(userId: string): Promise<TextHighlight[]> {
    return getSqliteHighlights(userId);
  }

  /**
   * Adicionar um grifo local
   */
  async addHighlight(userId: string, highlight: TextHighlight): Promise<void> {
    return addLocalHighlight(userId, highlight);
  }

  /**
   * Remover um grifo local pelo ID
   */
  async removeHighlight(userId: string, id: string): Promise<void> {
    return removeLocalHighlight(userId, id);
  }

  /**
   * Atualiza a lista de grifos de um capítulo específico no SQLite local
   */
  async updateHighlightsForChapter(
    userId: string,
    bookSlug: string,
    chapterId: number,
    chapterHighlights: TextHighlight[]
  ): Promise<void> {
    return updateLocalHighlightsForChapter(userId, bookSlug, chapterId, chapterHighlights);
  }
}

export const highlightService = HighlightService.getInstance();
