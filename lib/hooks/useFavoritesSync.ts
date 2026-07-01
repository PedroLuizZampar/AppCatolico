import { useState, useEffect } from 'react';
import { favoritesSyncService } from '../sync/FavoritesSyncService';
import { FavoriteParagraph } from '../types';
import { useAuth } from '../context/AuthContext';
import { syncEngine } from '../sync/SyncEngine';

export function useFavoritesSync() {
  const [favorites, setFavorites] = useState<FavoriteParagraph[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadFavorites();
      
      // Polling para atualizar favoritos locais - reduzido para 5 segundos
      const interval = setInterval(loadFavorites, 5000);
      return () => clearInterval(interval);
    } else {
      setFavorites([]);
      setLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const stored = await favoritesSyncService.getLocalFavorites(user.id);
      setFavorites(stored);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (favorite: FavoriteParagraph) => {
    if (!user) return;
    try {
      await favoritesSyncService.addFavorite(user.id, favorite);
      await loadFavorites();
      syncEngine.sync().catch(err => console.error('[useFavoritesSync] Erro no sync pós add:', err));
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      throw error;
    }
  };

  const addFavorites = async (newFavorites: FavoriteParagraph[]) => {
    if (!user) return;
    try {
      await favoritesSyncService.addFavorites(user.id, newFavorites);
      await loadFavorites();
      syncEngine.sync().catch(err => console.error('[useFavoritesSync] Erro no sync pós add em lote:', err));
    } catch (error) {
      console.error('Erro ao adicionar múltiplos favoritos:', error);
      throw error;
    }
  };

  const removeFavorite = async (favorite: FavoriteParagraph) => {
    if (!user) return;
    try {
      await favoritesSyncService.removeFavorite(user.id, favorite);
      await loadFavorites();
      syncEngine.sync().catch(err => console.error('[useFavoritesSync] Erro no sync pós remove:', err));
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      throw error;
    }
  };

  const removeFavorites = async (favoritesToRemove: FavoriteParagraph[]) => {
    if (!user) return;
    try {
      await favoritesSyncService.removeFavorites(user.id, favoritesToRemove);
      await loadFavorites();
      syncEngine.sync().catch(err => console.error('[useFavoritesSync] Erro no sync pós remove em lote:', err));
    } catch (error) {
      console.error('Erro ao remover múltiplos favoritos:', error);
      throw error;
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      await favoritesSyncService.clearAllFavorites(user.id);
      await loadFavorites();
      syncEngine.sync().catch(err => console.error('[useFavoritesSync] Erro no sync pós clear:', err));
    } catch (error) {
      console.error('Erro ao limpar favoritos:', error);
      throw error;
    }
  };

  const syncFavorites = async () => {
    await syncEngine.sync();
    await loadFavorites();
  };

  const cleanDuplicates = async () => {
    if (!user) return 0;
    try {
      const removed = await favoritesSyncService.cleanDuplicates(user.id);
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
