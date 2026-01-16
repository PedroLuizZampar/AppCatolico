import type { Book, Chapter, Paragraph } from './types';

import misteriosRaw from '../data/Mistérios Terço.json';

type MisterioEntry = {
  ordem: string;
  titulo: string;
  meditacao: string;
};

type GrupoMisterios = {
  grupo: string;
  dias: string[];
  misterios: MisterioEntry[];
};

const MISTERIOS = misteriosRaw as GrupoMisterios[];

const grupoToChapter = (grupo: GrupoMisterios, index: number): Chapter => {
  const diasInfo = grupo.dias.length > 0 ? ` (${grupo.dias.join(' e ')})` : '';
  const chapterName = `${grupo.grupo}${diasInfo}`;

  const paragraphs: Paragraph[] = grupo.misterios.map((misterio, i) => ({
    number: i + 1,
    label: `${misterio.ordem}: ${misterio.titulo}`,
    text: misterio.meditacao,
  }));

  return {
    chapter: index + 1,
    name: chapterName,
    paragraphs,
  };
};

export const misteriosTercoBook: Book = {
  file: {
    name: 'Mistérios Terço.json',
    path: 'data/Mistérios Terço.json',
    size_bytes: 0,
    pages: 0,
  },
  metadata: {
    title: 'Mistérios do Rosário',
    author: 'Tradição Católica',
    subject: 'Mistérios do Santo Rosário',
    keywords: 'terco,rosario,misterios,maria,oracao',
    creator: 'AppCatolico',
    producer: 'AppCatolico',
    creationDate: '',
    modDate: '',
  },
  chapters: MISTERIOS.map(grupoToChapter),
};
