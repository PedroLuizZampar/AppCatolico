import { useCallback, useEffect, useState } from 'react';
import { highlightService } from '../sync/HighlightService';
import { TextHighlight } from '../types';

export function useHighlights() {
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);

  const loadHighlights = useCallback(async () => {
    try {
      const stored = await highlightService.getHighlights();
      setHighlights(stored);
    } catch (error) {
      console.error('Erro ao carregar grifos:', error);
    }
  }, []);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  const addHighlight = useCallback(async (highlight: TextHighlight) => {
    setHighlights(prev => [...prev, highlight]);
    try {
      await highlightService.addHighlight(highlight);
    } catch (error) {
      console.error('Erro ao adicionar grifo:', error);
      loadHighlights();
    }
  }, [loadHighlights]);

  const removeHighlight = useCallback(async (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    try {
      await highlightService.removeHighlight(id);
    } catch (error) {
      console.error('Erro ao remover grifo:', error);
      loadHighlights();
    }
  }, [loadHighlights]);

  const updateChapterHighlights = useCallback(async (
    bookSlug: string,
    chapterId: number,
    chapterHighlights: TextHighlight[]
  ) => {
    setHighlights(prev => {
      const otherHighlights = prev.filter(
        h => !(h.bookSlug === bookSlug && h.chapterId === chapterId)
      );
      return [...otherHighlights, ...chapterHighlights];
    });
    try {
      await highlightService.updateHighlightsForChapter(bookSlug, chapterId, chapterHighlights);
    } catch (error) {
      console.error('Erro ao atualizar grifos do capítulo:', error);
      loadHighlights();
    }
  }, [loadHighlights]);

  return { highlights, addHighlight, removeHighlight, updateChapterHighlights };
}
