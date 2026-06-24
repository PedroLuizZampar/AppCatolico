import React, { memo, useMemo, useCallback, useRef } from 'react';
import { GestureResponderEvent, Pressable, StyleProp, Text, TextStyle } from 'react-native';
import { TextHighlight } from '@/lib/types';

/**
 * Tipo de cobertura de grifo para um parágrafo específico.
 * - 'full': parágrafo inteiro grifado (está no meio de um grifo cross-parágrafo)
 * - 'startOnly': começa neste parágrafo, vai até o fim
 * - 'endOnly': vem do parágrafo anterior, termina neste
 * - 'partial': grifo começa e termina neste parágrafo
 */
export type HighlightCoverage = {
  highlight: TextHighlight;
  type: 'full' | 'startOnly' | 'endOnly' | 'partial';
  startWord: number;  // Primeiro word index grifado neste parágrafo
  endWord: number;    // Último word index grifado neste parágrafo (inclusive)
};

interface HighlightableTextProps {
  text: string;
  coverages: HighlightCoverage[];
  isHighlightMode: boolean;
  isEraseMode: boolean;
  selectedColor: string;
  isDark: boolean;
  paragraphNumber: number;
  pendingStartWord?: number;        // Índice da palavra pendente neste parágrafo
  pendingCrossFullCoverage?: boolean; // Parágrafo inteiro coberto por seleção pendente
  onWordTap: (paragraphNumber: number, wordIndex: number) => void;
  onRemoveHighlight: (highlightId: string) => void;
  textStyle?: StyleProp<TextStyle>;
}

// Cache de linhas do onTextLayout por instância
interface TextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Encontra o índice da palavra no texto completo dada a posição do toque.
 * Usa as métricas de linha do onTextLayout para localizar:
 * 1. Qual linha foi tocada (por Y)
 * 2. Qual caractere na linha (por X, usando largura média)
 * 3. Qual palavra corresponde a essa posição no texto original
 */
function findWordAtPosition(
  locationX: number,
  locationY: number,
  lines: TextLine[],
  fullText: string
): number {
  if (lines.length === 0) return -1;

  // 1. Encontrar a linha tocada
  let line: TextLine | undefined;
  for (const l of lines) {
    if (locationY >= l.y && locationY <= l.y + l.height) {
      line = l;
      break;
    }
  }
  // Se não encontrou exatamente, pegar a mais próxima
  if (!line) {
    let minDist = Infinity;
    for (const l of lines) {
      const midY = l.y + l.height / 2;
      const dist = Math.abs(locationY - midY);
      if (dist < minDist) {
        minDist = dist;
        line = l;
      }
    }
  }
  if (!line) return -1;

  // 2. Posição aproximada do caractere na linha
  const lineText = line.text;
  if (lineText.length === 0) return -1;
  const avgCharWidth = line.width / lineText.length;
  const charPos = Math.max(0, Math.min(Math.floor(locationX / avgCharWidth), lineText.length - 1));

  // 3. Encontrar o início desta linha no texto completo
  // Usamos indexOf com busca incremental para evitar ambiguidade
  let lineStartInFullText = -1;
  const trimmedLine = lineText.replace(/\s+$/, ''); // linhas podem ter trailing space
  // Buscar a ocorrência correta pela ordem das linhas
  let searchFrom = 0;
  for (const l of lines) {
    const trimmed = l.text.replace(/\s+$/, '');
    const idx = fullText.indexOf(trimmed, searchFrom);
    if (idx === -1) break;
    if (l === line) {
      lineStartInFullText = idx;
      break;
    }
    searchFrom = idx + trimmed.length;
  }
  if (lineStartInFullText === -1) return -1;

  // 4. Posição absoluta do caractere no texto completo
  const absoluteCharPos = lineStartInFullText + charPos;

  // 5. Converter posição de caractere → índice de palavra
  const words = fullText.split(/\s+/);
  let charCount = 0;
  for (let i = 0; i < words.length; i++) {
    const wordEnd = charCount + words[i].length;
    if (absoluteCharPos < wordEnd) return i;
    charCount = wordEnd + 1; // +1 for space
  }

  return words.length - 1; // Último recurso: última palavra
}

/**
 * Componente que renderiza texto com grifos (marca-texto).
 * 
 * Estratégia de performance:
 * - SEMPRE renderiza usando spans agrupados (poucos nós React Native)
 * - No modo grifo, um único <Pressable> detecta toque e usa onTextLayout
 *   para determinar qual palavra foi tocada (0 gesture recognizers extras)
 * - O estado de seleção pendente é gerenciado pelo pai, não internamente
 */
function HighlightableTextComponent({
  text,
  coverages,
  isHighlightMode,
  isEraseMode,
  selectedColor,
  isDark,
  paragraphNumber,
  pendingStartWord,
  pendingCrossFullCoverage,
  onWordTap,
  onRemoveHighlight,
  textStyle,
}: HighlightableTextProps) {
  const textLinesRef = useRef<TextLine[]>([]);

  // Mapa: wordIndex → { color, id }
  const wordHighlightMap = useMemo(() => {
    const map = new Map<number, { color: string; id: string }>();
    for (const cov of coverages) {
      for (let wi = cov.startWord; wi <= cov.endWord; wi++) {
        map.set(wi, { color: cov.highlight.color, id: cov.highlight.id });
      }
    }
    return map;
  }, [coverages]);

  const handleTextLayout = useCallback((e: any) => {
    textLinesRef.current = e.nativeEvent.lines as TextLine[];
  }, []);

  const handlePress = useCallback((e: GestureResponderEvent) => {
    if (!isHighlightMode) return;
    const { locationX, locationY } = e.nativeEvent;
    const wordIndex = findWordAtPosition(locationX, locationY, textLinesRef.current, text);
    if (wordIndex < 0) return;

    if (isEraseMode) {
      const info = wordHighlightMap.get(wordIndex);
      if (info) onRemoveHighlight(info.id);
      return;
    }

    onWordTap(paragraphNumber, wordIndex);
  }, [isHighlightMode, isEraseMode, text, wordHighlightMap, paragraphNumber, onWordTap, onRemoveHighlight]);

  // Caminho rápido: sem grifos, sem pending e fora do modo de grifo
  if (coverages.length === 0 && !isHighlightMode && pendingStartWord === undefined && !pendingCrossFullCoverage) {
    return <Text style={textStyle}>{text}</Text>;
  }

  if (!text) return null;

  // Tokenizar
  const tokens = text.split(/(\s+)/);

  // Opacidade do grifo
  const opacityHex = isDark ? '4D' : '66';

  // Construir spans agrupados (sempre — mesmo no modo de grifo)
  interface TextSpan {
    text: string;
    color?: string;
  }
  const spans: TextSpan[] = [];
  let currentSpan: TextSpan | null = null;
  let wordCounter = 0;

  // Contar total de palavras para pendingCrossFullCoverage
  const totalWords = tokens.filter(t => t !== '' && !/^\s+$/.test(t)).length;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '') continue;

    const isSpace = /^\s+$/.test(token);
    let highlightColor: string | undefined;

    if (isSpace) {
      // Espaço: herda cor se entre palavras do mesmo grifo
      const prevWord = wordCounter - 1;
      const nextWord = wordCounter;
      const prevInfo = wordHighlightMap.get(prevWord);
      const nextInfo = wordHighlightMap.get(nextWord);
      if (prevInfo && nextInfo && prevInfo.id === nextInfo.id) {
        highlightColor = prevInfo.color;
      }
      // Pending cross full coverage: colorir espaço entre palavras
      if (!highlightColor && pendingCrossFullCoverage && prevWord >= 0 && nextWord < totalWords) {
        highlightColor = selectedColor;
      }
      // Pending: colorir espaço se entre pending start e alguma coisa
      if (!highlightColor && pendingStartWord !== undefined) {
        // Espaço adjacente à palavra pendente: herdar
        if (prevWord === pendingStartWord || nextWord === pendingStartWord) {
          // Não colorir espaço para seleção de uma só palavra
        }
      }
    } else {
      const currentWordIndex = wordCounter;
      wordCounter++;
      const info = wordHighlightMap.get(currentWordIndex);
      if (pendingStartWord === currentWordIndex) {
        highlightColor = selectedColor;
      } else if (info) {
        highlightColor = info.color;
      } else if (pendingCrossFullCoverage) {
        highlightColor = selectedColor;
      }
    }

    if (currentSpan && currentSpan.color === highlightColor) {
      currentSpan.text += token;
    } else {
      currentSpan = { text: token, color: highlightColor };
      spans.push(currentSpan);
    }
  }

  const textContent = (
    <Text style={textStyle} onTextLayout={isHighlightMode ? handleTextLayout : undefined}>
      {spans.map((span, idx) => {
        if (span.color) {
          return (
            <Text key={idx} style={{ backgroundColor: span.color + opacityHex }}>
              {span.text}
            </Text>
          );
        }
        return span.text;
      })}
    </Text>
  );

  // No modo de grifo, envolver num Pressable para capturar toques
  if (isHighlightMode) {
    return (
      <Pressable onPress={handlePress}>
        {textContent}
      </Pressable>
    );
  }

  return textContent;
}

export const HighlightableText = memo(HighlightableTextComponent);
HighlightableText.displayName = 'HighlightableText';
