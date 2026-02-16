import React from 'react';
import { Text, TextStyle } from 'react-native';

interface HighlightedTextProps {
  text: string;
  highlight: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
  numberOfLines?: number;
}

const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  highlight,
  style,
  highlightStyle,
  numberOfLines,
}) => {
  if (!highlight.trim()) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  const strippedText = normalize(text);
  const strippedQuery = normalize(highlight);

  // Find all occurrences in the normalized version
  const parts: { text: string; highlighted: boolean }[] = [];
  let lastIndex = 0;
  let searchFrom = 0;

  while (searchFrom <= strippedText.length - strippedQuery.length) {
    const matchIndex = strippedText.indexOf(strippedQuery, searchFrom);
    if (matchIndex === -1) break;

    if (matchIndex > lastIndex) {
      parts.push({ text: text.substring(lastIndex, matchIndex), highlighted: false });
    }
    parts.push({
      text: text.substring(matchIndex, matchIndex + strippedQuery.length),
      highlighted: true,
    });
    lastIndex = matchIndex + strippedQuery.length;
    searchFrom = lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlighted: false });
  }

  if (parts.length === 0) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.highlighted ? (
          <Text key={i} style={highlightStyle}>{part.text}</Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        )
      )}
    </Text>
  );
};
