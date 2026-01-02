import type { ImageSourcePropType } from 'react-native';

import type { Book, Chapter, Paragraph } from './types';

import viaSacraRaw from '../data/Via Sacra/via-sacra.json';

type ViaSacraStation = {
  index: number;
  estacao: string;
  title: string;
  versiculo?: string;
  resposta?: string;
  contemplacao?: string;
  oracao?: string;
  oracoes_tradicionais?: string;
  cantico?: string;
};

type ViaSacraRaw = {
  oracao_inicial?: string;
  stations: ViaSacraStation[];
  images?: Array<{ file: string; width: number; height: number }>;
};

const VIA_SACRA = viaSacraRaw as ViaSacraRaw;

export const VIA_SACRA_IMAGE_SOURCES: Record<number, ImageSourcePropType> = {
  1: require('../data/Via Sacra/images/estacao-01.png'),
  2: require('../data/Via Sacra/images/estacao-02.png'),
  3: require('../data/Via Sacra/images/estacao-03.png'),
  4: require('../data/Via Sacra/images/estacao-04.png'),
  5: require('../data/Via Sacra/images/estacao-05.png'),
  6: require('../data/Via Sacra/images/estacao-06.png'),
  7: require('../data/Via Sacra/images/estacao-07.png'),
  8: require('../data/Via Sacra/images/estacao-08.png'),
  9: require('../data/Via Sacra/images/estacao-09.png'),
  10: require('../data/Via Sacra/images/estacao-10.png'),
  11: require('../data/Via Sacra/images/estacao-11.png'),
  12: require('../data/Via Sacra/images/estacao-12.png'),
  13: require('../data/Via Sacra/images/estacao-13.png'),
  14: require('../data/Via Sacra/images/estacao-14.png'),
};

const makeField = (number: number, label: string, text?: string): Paragraph | null => {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  return { number, label, text: trimmed };
};

const stationToChapter = (station: ViaSacraStation): Chapter => {
  const fields = [
    makeField(1, 'Versículo', station.versiculo),
    makeField(2, 'Resposta', station.resposta),
    makeField(3, 'Contemplação', station.contemplacao),
    makeField(4, 'Oração', station.oracao),
    makeField(5, 'Orações tradicionais', station.oracoes_tradicionais),
    makeField(6, 'Cântico', station.cantico),
  ].filter((p): p is Paragraph => Boolean(p));

  const name = `${station.estacao} — ${station.title}`;

  return {
    chapter: station.index,
    name,
    paragraphs: fields,
  };
};

export const viaSacraBook: Book = {
  file: {
    name: 'via-sacra.json',
    path: 'data/Via Sacra/via-sacra.json',
    size_bytes: 0,
    pages: 0,
  },
  metadata: {
    title: 'Via Sacra',
    author: 'Tradição Católica',
    subject: 'Via Sacra',
    keywords: 'via-sacra,estacoes,paixao',
    creator: 'AppCatolico',
    producer: 'AppCatolico',
    creationDate: '',
    modDate: '',
  },
  chapters: (VIA_SACRA.stations ?? []).map(stationToChapter),
};

export const getViaSacraImageSource = (stationIndex: number): ImageSourcePropType | undefined => {
  return VIA_SACRA_IMAGE_SOURCES[stationIndex];
};
