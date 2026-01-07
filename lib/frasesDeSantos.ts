import type { Book, Chapter } from './types';

import frasesRaw from '../data/Frases de Santos Agrupado.json';

type FrasesDeSantosEntry = {
  santo: string;
  frases: string[];
};

const FRASES = (frasesRaw as unknown as FrasesDeSantosEntry[]).filter(
  (item) => Boolean(item?.santo) && Array.isArray(item?.frases)
);

const entryToChapter = (entry: FrasesDeSantosEntry, index: number): Chapter => {
  const santo = (entry.santo ?? '').trim() || `Santo ${index + 1}`;

  const paragraphs = (entry.frases ?? [])
    .map((text, i) => ({ number: i + 1, text: String(text ?? '').trim() }))
    .filter((p) => p.text.length > 0);

  return {
    chapter: index + 1,
    name: santo,
    paragraphs,
  };
};

export const frasesDeSantosBook: Book = {
  file: {
    name: 'Frases de Santos Agrupado.json',
    path: 'data/Frases de Santos Agrupado.json',
    size_bytes: 0,
    pages: 0,
  },
  metadata: {
    title: 'Frases de Santos',
    author: 'Santos e Beatos',
    subject: 'Frases de Santos',
    keywords: 'frases,santos,citacoes,espiritualidade',
    creator: 'AppCatolico',
    producer: 'AppCatolico',
    creationDate: '',
    modDate: '',
  },
  chapters: FRASES.map(entryToChapter),
};
