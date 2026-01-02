import { useState, useEffect } from 'react';
import { favoritesSyncService } from '../sync/FavoritesSyncService';
import { FavoriteParagraph } from '../types';

export function useFavoritesSync() {
  const [favorites, setFavorites] = useState<FavoriteParagraph[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
    
    // Polling para atualizar favoritos - reduzido para 5 segundos
    const interval = setInterval(loadFavorites, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await favoritesSyncService.getLocalFavorites();
      setFavorites(stored);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (favorite: FavoriteParagraph) => {
    try {
      await favoritesSyncService.addFavorite(favorite);
      await loadFavorites();
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      throw error;
    }
  };

  const addFavorites = async (newFavorites: FavoriteParagraph[]) => {
    try {
      await favoritesSyncService.addFavorites(newFavorites);
      await loadFavorites();
    } catch (error) {
      console.error('Erro ao adicionar múltiplos favoritos:', error);
      throw error;
    }
  };

  const removeFavorite = async (favorite: FavoriteParagraph) => {
    try {
      await favoritesSyncService.removeFavorite(favorite);
      await loadFavorites();
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      throw error;
    }
  };

  const removeFavorites = async (favoritesToRemove: FavoriteParagraph[]) => {
    try {
      await favoritesSyncService.removeFavorites(favoritesToRemove);
      await loadFavorites();
    } catch (error) {
      console.error('Erro ao remover múltiplos favoritos:', error);
      throw error;
    }
  };

  const clearAll = async () => {
    try {
      await favoritesSyncService.clearAllFavorites();
      await loadFavorites();
    } catch (error) {
      console.error('Erro ao limpar favoritos:', error);
      throw error;
    }
  };

  const syncFavorites = async () => {
    // No-op: Sync removido
    await loadFavorites();
  };

  const cleanDuplicates = async () => {
    try {
      const removed = await favoritesSyncService.cleanDuplicates();
      await loadFavorites();
      return removed;
    } catch (error) {
      console.error('Erro ao limpar duplicatas:', error);
      throw error;
    }
  };

  const isFavorite = (bookSlug: string, chapterId: number, paragraphNumber: number): boolean => {
    if (bookSlug === 'catecismo') {
      return favorites.some(
        fav => fav.bookSlug === 'catecismo' && fav.paragraphNumber === paragraphNumber
      );
    }

    return favorites.some(
      fav => fav.bookSlug === bookSlug && 
             fav.chapterId === chapterId && 
             fav.paragraphNumber === paragraphNumber
    );
  };

  return {
    favorites,
    loading,
    addFavorite,
    addFavorites,
    removeFavorite,
    removeFavorites,
    clearAll,
    syncFavorites,
    cleanDuplicates,
    isFavorite,
  };
}
