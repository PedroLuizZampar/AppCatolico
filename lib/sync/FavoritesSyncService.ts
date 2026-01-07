import AsyncStorage from '@react-native-async-storage/async-storage';
import { FavoriteParagraph } from '../types';

const FAVORITES_KEY = '@app_catolico_favorites';

/**
 * Serviço de gerenciamento de favoritos locais
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
   * Migrar favoritos antigos adicionando campo 'type'
   */
  private async migrateFavoritesIfNeeded(favorites: FavoriteParagraph[]): Promise<FavoriteParagraph[]> {
    let needsMigration = false;
    
    const migrated = favorites.map(fav => {
      // Normalizar Frases de Santos para sempre usar categoria dedicada
      if (fav.bookSlug === 'frases-de-santos' && fav.type !== 'frases') {
        needsMigration = true;
        return {
          ...fav,
          type: 'frases' as const,
        };
      }

      if (!fav.type) {
        needsMigration = true;
        // Detectar tipo baseado no formato do bookSlug
        const isBiblia = fav.bookSlug.match(/^(genesis|exodo|levitico|numeros|deuteronomio|josue|juizes|rute|1samuel|2samuel|1reis|2reis|1cronicas|2cronicas|esdras|neemias|tobias|judite|ester|1macabeus|2macabeus|jo|salmos|proverbios|eclesiastes|canticos|sabedoria|eclesiastico|isaias|jeremias|lamentacoes|baruc|ezequiel|daniel|oseias|joel|amos|abdias|jonas|miqueias|naum|habacuc|sofonias|ageu|zacarias|malaquias|mateus|marcos|lucas|joao|atos|romanos|1corintios|2corintios|galatas|efesios|filipenses|colossenses|1tessalonicenses|2tessalonicenses|1timoteo|2timoteo|tito|filemom|hebreus|tiago|1pedro|2pedro|1joao|2joao|3joao|judas|apocalipse)$/i);
        
        return {
          ...fav,
          type: isBiblia ? 'biblia' as const : 'livro' as const
        };
      }
      return fav;
    });

    if (needsMigration) {
      await this.saveLocalFavorites(migrated);
    }

    return migrated;
  }

  /**
   * Buscar favoritos locais
   */
  async getLocalFavorites(): Promise<FavoriteParagraph[]> {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      const favorites = stored ? JSON.parse(stored) : [];
      const migrated = await this.migrateFavoritesIfNeeded(favorites);
      
      // Remover duplicatas se existirem
      return this.removeDuplicates(migrated);
    } catch (error) {
      console.error('Erro ao buscar favoritos locais:', error);
      return [];
    }
  }

  /**
   * Remover duplicatas do array de favoritos
   */
  private removeDuplicates(favorites: FavoriteParagraph[]): FavoriteParagraph[] {
    const seen = new Map<string, FavoriteParagraph>();
    
    for (const fav of favorites) {
      const key = this.getFavoriteIdentityKey(fav);
      
      // Se não existe ou o existente é mais antigo, substituir
      if (!seen.has(key) || seen.get(key)!.timestamp < fav.timestamp) {
        seen.set(key, fav);
      }
    }
    
    return Array.from(seen.values());
  }

  private getFavoriteIdentityKey(fav: FavoriteParagraph): string {
    if (fav.bookSlug === 'catecismo') {
      // Catecismo pode mudar de "capítulo" (grupo), mas o parágrafo é único.
      return `${fav.bookSlug}-${fav.paragraphNumber}`;
    }
    return `${fav.bookSlug}-${fav.chapterId}-${fav.paragraphNumber}`;
  }

  private favoritesMatch(a: FavoriteParagraph, b: FavoriteParagraph): boolean {
    if (a.bookSlug !== b.bookSlug) return false;
    if (a.bookSlug === 'catecismo') {
      return a.paragraphNumber === b.paragraphNumber;
    }
    return a.chapterId === b.chapterId && a.paragraphNumber === b.paragraphNumber;
  }

  /**
   * Salvar favoritos localmente
   */
  async saveLocalFavorites(favorites: FavoriteParagraph[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Erro ao salvar favoritos locais:', error);
      throw error;
    }
  }

  /**
   * Adicionar favorito local
   */
  async addFavorite(favorite: FavoriteParagraph): Promise<void> {
    try {
      const favorites = await this.getLocalFavorites();
      favorites.push(favorite);
      await this.saveLocalFavorites(favorites);
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      throw error;
    }
  }

  /**
   * Adicionar múltiplos favoritos de uma vez
   */
  async addFavorites(newFavorites: FavoriteParagraph[]): Promise<void> {
    try {
      const favorites = await this.getLocalFavorites();
      favorites.push(...newFavorites);
      await this.saveLocalFavorites(favorites);
    } catch (error) {
      console.error('Erro ao adicionar múltiplos favoritos:', error);
      throw error;
    }
  }

  /**
   * Remover múltiplos favoritos de uma vez
   */
  async removeFavorites(favoritesToRemove: FavoriteParagraph[]): Promise<void> {
    try {
      const favorites = await this.getLocalFavorites();
      const filtered = favorites.filter(
        fav => !favoritesToRemove.some(
          rem => this.favoritesMatch(rem, fav)
        )
      );
      await this.saveLocalFavorites(filtered);
    } catch (error) {
      console.error('Erro ao remover múltiplos favoritos:', error);
      throw error;
    }
  }

  /**
   * Remover favorito local
   */
  async removeFavorite(favorite: FavoriteParagraph): Promise<void> {
    try {
      const favorites = await this.getLocalFavorites();
      const filtered = favorites.filter(
        fav => !this.favoritesMatch(favorite, fav)
      );
      await this.saveLocalFavorites(filtered);
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      throw error;
    }
  }

  /**
   * Limpar todos os favoritos
   */
  async clearAllFavorites(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Erro ao limpar favoritos:', error);
      throw error;
    }
  }

  /**
   * Limpar duplicatas manualmente
   */
  async cleanDuplicates(): Promise<number> {
    try {
      const favorites = await this.getLocalFavorites();
      const unique = this.removeDuplicates(favorites);
      
      if (unique.length < favorites.length) {
        await this.saveLocalFavorites(unique);
        return favorites.length - unique.length;
      }
      return 0;
    } catch (error) {
      console.error('Erro ao limpar duplicatas:', error);
      throw error;
    }
  }
}

export const favoritesSyncService = FavoritesSyncService.getInstance();
