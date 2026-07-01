import { FavoriteParagraph } from '../types';
import { 
  getLocalFavorites as getSqliteFavorites, 
  addLocalFavorite, 
  addLocalFavorites, 
  removeLocalFavorite, 
  removeLocalFavorites, 
  clearAllLocalFavorites 
} from '../sqlite/sqliteDatabase';

/**
 * Serviço de gerenciamento de favoritos do usuário com suporte a SQLite local.
 */
export class FavoritesSyncService {
  private static instance: FavoritesSyncService;

  private constructor() {}

  static getInstance(): FavoritesSyncService {
    if (!FavoritesSyncService.instance) {
      FavoritesSyncService.instance = new FavoritesSyncService();
    }
    return FavoritesSyncService.instance;
  }

  /**
   * Buscar favoritos locais do usuário
   */
  async getLocalFavorites(userId: string): Promise<FavoriteParagraph[]> {
    return getSqliteFavorites(userId);
  }

  /**
   * Adicionar favorito local
   */
  async addFavorite(userId: string, favorite: FavoriteParagraph): Promise<void> {
    return addLocalFavorite(userId, favorite);
  }

  /**
   * Adicionar múltiplos favoritos de uma vez
   */
  async addFavorites(userId: string, newFavorites: FavoriteParagraph[]): Promise<void> {
    return addLocalFavorites(userId, newFavorites);
  }

  /**
   * Remover favorito local (soft delete para sincronização)
   */
  async removeFavorite(userId: string, favorite: FavoriteParagraph): Promise<void> {
    return removeLocalFavorite(userId, favorite);
  }

  /**
   * Remover múltiplos favoritos de uma vez
   */
  async removeFavorites(userId: string, favoritesToRemove: FavoriteParagraph[]): Promise<void> {
    return removeLocalFavorites(userId, favoritesToRemove);
  }

  /**
   * Limpar todos os favoritos localmente
   */
  async clearAllFavorites(userId: string): Promise<void> {
    return clearAllLocalFavorites(userId);
  }

  /**
   * Limpar duplicatas
   */
  async cleanDuplicates(userId: string): Promise<number> {
    // No-op: as restrições de chave única do SQLite evitam duplicatas nativamente
    return 0;
  }
}

export const favoritesSyncService = FavoritesSyncService.getInstance();
