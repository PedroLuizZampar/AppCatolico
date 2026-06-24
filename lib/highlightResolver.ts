import { TextHighlight } from './types';

interface ParagraphInfo {
  number: number;
  text: string;
}

/**
 * Função utilitária para obter a contagem de palavras de um texto.
 * Deve usar o mesmo critério de tokenização do HighlightableText.tsx.
 */
function getWordCount(text: string): number {
  if (!text) return 0;
  const tokens = text.split(/(\s+)/);
  return tokens.filter(t => t !== '' && !/^\s+$/.test(t)).length;
}

/**
 * Resolve conflitos e interseções de grifos em um capítulo.
 * Retorna a nova lista de grifos do capítulo, com os grifos antigos cortados/divididos onde houver sobreposição.
 */
export function resolveHighlightConflicts(
  existingHighlights: TextHighlight[],
  newHighlight: TextHighlight,
  paragraphs: ParagraphInfo[]
): TextHighlight[] {
  if (paragraphs.length === 0) {
    return [...existingHighlights, newHighlight];
  }

  // 1. Mapear contagem de palavras e offsets para cada parágrafo
  const minP = Math.min(...paragraphs.map(p => p.number));
  const maxP = Math.max(...paragraphs.map(p => p.number));
  
  // Garantir que temos um array indexado contínuo correspondente aos números físicos de parágrafo
  const wordCounts: number[] = [];
  const paragraphTexts: string[] = [];
  
  for (let pNum = minP; pNum <= maxP; pNum++) {
    const p = paragraphs.find(item => item.number === pNum);
    const text = p ? p.text : '';
    wordCounts.push(getWordCount(text));
    paragraphTexts.push(text);
  }

  // Helper para obter soma cumulativa de palavras antes do parágrafo pNum
  const getAbsoluteWordOffset = (pNum: number): number => {
    let sum = 0;
    const index = pNum - minP;
    for (let i = 0; i < index; i++) {
      sum += wordCounts[i] || 0;
    }
    return sum;
  };

  // Helper para mapear um highlight para um intervalo absoluto linear 1D (inclusive)
  const getAbsoluteRange = (h: TextHighlight) => {
    const startOffset = getAbsoluteWordOffset(h.paragraphNumber);
    const startIdx = startOffset + h.startWordIndex;
    
    const endP = h.endParagraphNumber ?? h.paragraphNumber;
    const endOffset = getAbsoluteWordOffset(endP);
    const endWord = h.endWordIndexEnd ?? h.endWordIndex;
    const endIdx = endOffset + endWord;
    
    return { start: startIdx, end: endIdx };
  };

  // Helper para construir o highlightedText a partir de índices de palavras absolutos
  const getHighlightedTextFromRange = (startAbs: number, endAbs: number): string => {
    let currentAbs = 0;
    const words: string[] = [];

    for (let i = 0; i < wordCounts.length; i++) {
      const text = paragraphTexts[i];
      const tokens = text.split(/(\s+)/);
      const pWords = tokens.filter(t => t !== '' && !/^\s+$/.test(t));
      
      const pStartAbs = currentAbs;
      const pEndAbs = currentAbs + pWords.length - 1;

      // Se há intersecção entre o parágrafo e o intervalo absoluto solicitado
      if (pEndAbs >= startAbs && pStartAbs <= endAbs) {
        const localStart = Math.max(0, startAbs - pStartAbs);
        const localEnd = Math.min(pWords.length - 1, endAbs - pStartAbs);
        
        words.push(...pWords.slice(localStart, localEnd + 1));
      }
      currentAbs += pWords.length;
    }
    
    return words.join(' ');
  };

  // Helper para converter um intervalo absoluto de volta para um TextHighlight
  const convertAbsoluteRangeToHighlight = (
    startAbs: number,
    endAbs: number,
    originalHighlight: TextHighlight
  ): TextHighlight => {
    let startParagraph = minP;
    let startWordIndex = 0;
    let endParagraph = minP;
    let endWordIndexEnd = 0;

    let currentAbs = 0;
    let foundStart = false;
    
    // Achar início
    for (let i = 0; i < wordCounts.length; i++) {
      const pWordsCount = wordCounts[i];
      if (startAbs >= currentAbs && startAbs < currentAbs + pWordsCount) {
        startParagraph = minP + i;
        startWordIndex = startAbs - currentAbs;
        foundStart = true;
        break;
      }
      currentAbs += pWordsCount;
    }
    if (!foundStart) {
      startParagraph = maxP;
      startWordIndex = Math.max(0, (wordCounts[wordCounts.length - 1] || 1) - 1);
    }

    currentAbs = 0;
    let foundEnd = false;
    // Achar fim
    for (let i = 0; i < wordCounts.length; i++) {
      const pWordsCount = wordCounts[i];
      if (endAbs >= currentAbs && endAbs < currentAbs + pWordsCount) {
        endParagraph = minP + i;
        endWordIndexEnd = endAbs - currentAbs;
        foundEnd = true;
        break;
      }
      currentAbs += pWordsCount;
    }
    if (!foundEnd) {
      endParagraph = maxP;
      endWordIndexEnd = Math.max(0, (wordCounts[wordCounts.length - 1] || 1) - 1);
    }

    const highlightedText = getHighlightedTextFromRange(startAbs, endAbs);

    // Gerar um ID único
    const id = `${originalHighlight.bookSlug}-${originalHighlight.chapterId}-${startParagraph}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return {
      ...originalHighlight,
      id,
      paragraphNumber: startParagraph,
      startWordIndex,
      endWordIndex: startParagraph === endParagraph ? endWordIndexEnd : startWordIndex,
      endParagraphNumber: endParagraph,
      endWordIndexEnd,
      highlightedText,
    };
  };

  // Novo grifo linear
  const newRange = getAbsoluteRange(newHighlight);

  const newHighlightsList: TextHighlight[] = [];

  for (const h of existingHighlights) {
    const oldRange = getAbsoluteRange(h);

    // Verificar se há interseção
    const hasIntersection = !(newRange.end < oldRange.start || newRange.start > oldRange.end);

    if (!hasIntersection) {
      newHighlightsList.push(h);
      continue;
    }

    // Se houver interseção, calculamos os pedaços que sobram do grifo antigo:
    
    // 1. Sobra à esquerda: de oldRange.start até newRange.start - 1
    if (oldRange.start < newRange.start) {
      const leftPart = convertAbsoluteRangeToHighlight(oldRange.start, newRange.start - 1, h);
      newHighlightsList.push(leftPart);
    }

    // 2. Sobra à direita: de newRange.end + 1 até oldRange.end
    if (oldRange.end > newRange.end) {
      const rightPart = convertAbsoluteRangeToHighlight(newRange.end + 1, oldRange.end, h);
      newHighlightsList.push(rightPart);
    }

    // O grifo antigo h em si é consumido e não vai para newHighlightsList
  }

  // Adicionar o novo destaque
  newHighlightsList.push(newHighlight);

  return newHighlightsList;
}
