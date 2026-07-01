import { useCallback, useEffect, useState } from 'react';
import { highlightService } from '../sync/HighlightService';
import { TextHighlight } from '../types';
import { useAuth } from '../context/AuthContext';
import { syncEngine } from '../sync/SyncEngine';

export function useHighlights() {
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);
  const { user } = useAuth();

  const loadHighlights = useCallback(async () => {
    if (!user) {
      setHighlights([]);
      return;
    }
    try {
      const stored = await highlightService.getHighlights(user.id);
      setHighlights(stored);
    } catch (error) {
      console.error('Erro ao carregar grifos:', error);
    }
  }, [user]);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  const addHighlight = useCallback(async (highlight: TextHighlight) => {
    if (!user) return;
    setHighlights(prev => [...prev, highlight]);
    try {
      await highlightService.addHighlight(user.id, highlight);
      syncEngine.sync().catch(err => console.error('[useHighlights] Erro no sync pós add:', err));
    } catch (error) {
      console.error('Erro ao adicionar grifo:', error);
      loadHighlights();
    }
  }, [user, loadHighlights]);

  const removeHighlight = useCallback(async (id: string) => {
    if (!user) return;
    setHighlights(prev => prev.filter(h => h.id !== id));
    try {
      await highlightService.removeHighlight(user.id, id);
      syncEngine.sync().catch(err => console.error('[useHighlights] Erro no sync pós remove:', err));
    } catch (error) {
      console.error('Erro ao remover grifo:', error);
      loadHighlights();
    }
  }, [user, loadHighlights]);

  const updateChapterHighlights = useCallback(async (
    bookSlug: string,
    chapterId: number,
    chapterHighlights: TextHighlight[]
  ) => {
    if (!user) return;
    setHighlights(prev => {
      const otherHighlights = prev.filter(
        h => !(h.bookSlug === bookSlug && h.chapterId === chapterId)
      );
      return [...otherHighlights, ...chapterHighlights];
    });
    try {
      await highlightService.updateHighlightsForChapter(user.id, bookSlug, chapterId, chapterHighlights);
      syncEngine.sync().catch(err => console.error('[useHighlights] Erro no sync pós update:', err));
    } catch (error) {
      console.error('Erro ao atualizar grifos do capítulo:', error);
      loadHighlights();
    }
  }, [user, loadHighlights]);

  return { highlights, addHighlight, removeHighlight, updateChapterHighlights };
}
