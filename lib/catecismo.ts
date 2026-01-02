import { Book, Paragraph } from './types';

import CatecismoAgrupadoRaw from '../data/Catecismo Agrupado.json';
import CatecismoCompletoRaw from '../data/Catecismo da Igreja Católica.json';

type NumberedParagraph = Paragraph;

type CatecismoAgrupadoGroup = {
  focus?: string;
  description?: string;
  count?: number;
  paragraphs?: unknown;
};

type CatecismoAgrupado = {
  meta?: {
    generated_at?: string;
    source?: string;
    total_paragraphs?: number;
    method?: string;
  };
  groups?: unknown;
};

const isNumberedParagraph = (value: unknown): value is NumberedParagraph => {
  const v = value as any;
  return v && typeof v.number === 'number' && typeof v.text === 'string';
};

const toNumberedParagraphs = (value: unknown): NumberedParagraph[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isNumberedParagraph).map(p => ({ number: p.number, text: p.text }));
};

const dedupeByNumber = (items: NumberedParagraph[]): NumberedParagraph[] => {
  const seen = new Set<number>();
  const out: NumberedParagraph[] = [];
  for (const p of items) {
    if (!seen.has(p.number)) {
      seen.add(p.number);
      out.push(p);
    }
  }
  out.sort((a, b) => a.number - b.number);
  return out;
};

const normalizeAgrupado = (raw: CatecismoAgrupado): CatecismoAgrupadoGroup[] => {
  const groupsRaw = Array.isArray(raw?.groups) ? (raw.groups as unknown[]) : [];
  return groupsRaw
    .map(g => g as CatecismoAgrupadoGroup)
    .filter(g => typeof g?.focus === 'string' && g.focus.trim().length > 0);
};

const buildCatecismoAgrupadoBook = (): {
  book: Book;
  chapterIdByParagraphNumber: Record<number, number>;
  chapterNameById: Record<number, string>;
} => {
  const raw = CatecismoAgrupadoRaw as unknown as CatecismoAgrupado;
  const groups = normalizeAgrupado(raw);

  const chapters: Book['chapters'] = [];
  const chapterIdByParagraphNumber: Record<number, number> = {};
  const chapterNameById: Record<number, string> = {};

  groups.forEach((group, idx) => {
    const chapterId = idx + 1;
    const focus = String(group.focus || '').trim();

    const name = focus;
    const paragraphs = dedupeByNumber(toNumberedParagraphs(group.paragraphs));

    chapters.push({
      chapter: chapterId,
      name,
      paragraphs,
    });

    chapterNameById[chapterId] = name;

    for (const p of paragraphs) {
      if (chapterIdByParagraphNumber[p.number] == null) {
        chapterIdByParagraphNumber[p.number] = chapterId;
      }
    }
  });

  const book: Book = {
    file: {
      name: 'Catecismo Agrupado',
      path: '',
      size_bytes: 0,
      pages: 0,
    },
    metadata: {
      title: 'Catecismo da Igreja Católica',
      author: 'Igreja Católica',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: '',
      modDate: '',
    },
    chapters,
  };

  return { book, chapterIdByParagraphNumber, chapterNameById };
};

const buildTextByParagraphNumber = (): Record<number, string> => {
  const result: Record<number, string> = {};

  const visit = (node: unknown) => {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    if (typeof node !== 'object') return;

    const anyNode = node as any;
    if (typeof anyNode.number === 'number' && typeof anyNode.text === 'string') {
      const num = anyNode.number as number;
      if (result[num] == null) result[num] = anyNode.text as string;
    }

    for (const value of Object.values(anyNode)) {
      visit(value);
    }
  };

  visit(CatecismoCompletoRaw as unknown);
  return result;
};

const agrupado = buildCatecismoAgrupadoBook();
const textByParagraphNumber = buildTextByParagraphNumber();

export const catecismoAgrupadoBook: Book = agrupado.book;

export const getCatecismoChapterIdForParagraph = (paragraphNumber: number): number | null => {
  const id = agrupado.chapterIdByParagraphNumber[paragraphNumber];
  return typeof id === 'number' ? id : null;
};

export const getCatecismoChapterNameById = (chapterId: number): string | null => {
  const name = agrupado.chapterNameById[chapterId];
  return typeof name === 'string' ? name : null;
};

export const getCatecismoParagraphTextByNumber = (paragraphNumber: number): string | null => {
  const text = textByParagraphNumber[paragraphNumber];
  return typeof text === 'string' ? text : null;
};

export const findCatecismoParagraphByNumber = (
  paragraphNumber: number
): { text: string | null; chapterId: number | null; chapterName: string | null } => {
  const text = getCatecismoParagraphTextByNumber(paragraphNumber);
  const chapterId = getCatecismoChapterIdForParagraph(paragraphNumber);
  const chapterName = chapterId ? getCatecismoChapterNameById(chapterId) : null;
  return { text, chapterId, chapterName };
};
