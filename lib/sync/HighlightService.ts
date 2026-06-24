import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextHighlight } from '../types';

const HIGHLIGHTS_KEY = '@app_catolico_highlights';

/**
 * Serviço de gerenciamento de grifos locais.
 * Segue o mesmo padrão singleton do FavoritesSyncService.
 */
export class HighlightService {
  private static instance: HighlightService;
  private cache: TextHighlight[] | null = null;

  private constructor() { }

  static getInstance(): HighlightService {
    if (!HighlightService.instance) {
      HighlightService.instance = new HighlightService();
    }
    return HighlightService.instance;
  }

  /**
   * Buscar todos os grifos salvos
   */
  async getHighlights(): Promise<TextHighlight[]> {
    if (this.cache !== null) {
      return this.cache;
    }
    try {
      const stored = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
      const parsed: TextHighlight[] = stored ? JSON.parse(stored) : [];
      this.cache = parsed;
      return parsed;
    } catch (error) {
      console.error('Erro ao buscar grifos:', error);
      return [];
    }
  }

  /**
   * Salvar grifos localmente
   */
  private async saveHighlights(highlights: TextHighlight[]): Promise<void> {
    this.cache = highlights;
    try {
      await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
    } catch (error) {
      console.error('Erro ao salvar grifos:', error);
      throw error;
    }
  }

  /**
   * Adicionar um grifo
   */
  async addHighlight(highlight: TextHighlight): Promise<void> {
    const highlights = await this.getHighlights();
    const updated = [...highlights, highlight];
    await this.saveHighlights(updated);
  }

  /**
   * Remover um grifo pelo ID
   */
  async removeHighlight(id: string): Promise<void> {
    const highlights = await this.getHighlights();
    const filtered = highlights.filter(h => h.id !== id);
    await this.saveHighlights(filtered);
  }

  /**
   * Atualiza a lista de grifos de um capítulo específico (salvamento em lote pós-resolução de conflitos)
   */
  async updateHighlightsForChapter(
    bookSlug: string,
    chapterId: number,
    chapterHighlights: TextHighlight[]
  ): Promise<void> {
    const allHighlights = await this.getHighlights();
    const otherHighlights = allHighlights.filter(
      h => !(h.bookSlug === bookSlug && h.chapterId === chapterId)
    );
    const updated = [...otherHighlights, ...chapterHighlights];
    await this.saveHighlights(updated);
  }
}

export const highlightService = HighlightService.getInstance();
