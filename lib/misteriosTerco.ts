import type { Book, Chapter, Paragraph } from './types';

import misteriosRaw from '../data/Rosário/Mistérios Terço.json';

type MisterioEntry = {
  ordem: string;
  titulo: string;
  leitura_biblica?: { referencia?: string; texto?: string };
  meditacao_guia?: string;
  meditacao_detalhada?: string;
};

type GrupoMisterios = {
  grupo: string;
  dias: string[];
  misterios: MisterioEntry[];
};

const MISTERIOS = misteriosRaw as GrupoMisterios[];

// Transformar em capítulos individuais por mistério (total 20 capítulos)
const chapters: Chapter[] = [];
MISTERIOS.forEach((grupo) => {
  grupo.misterios.forEach((misterio) => {
    const chapterIndex = chapters.length + 1;

    // Definimos o nome do capítulo como a ordem (ex: "1º Mistério")
    // para que o título da página mostre apenas o n-ésimo mistério.
    const chapterName = misterio.ordem;

    const paragraph: Paragraph = {
      number: 1,
      // label guarda o título do mistério (nome), que usaremos acima da imagem
      label: misterio.titulo,
      // Preferir meditação detalhada, cair para a guia de meditação, ou para o texto bíblico
      text: (misterio as any).meditacao_detalhada ?? (misterio as any).meditacao_guia ?? (misterio as any).leitura_biblica?.texto ?? '',
    };

    chapters.push({
      chapter: chapterIndex,
      name: chapterName,
      paragraphs: [paragraph],
    });
  });
});

export const misteriosTercoBook: Book = {
  file: {
    name: 'Mistérios Terço.json',
    path: 'data/Rosário/Mistérios Terço.json',
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
  chapters,
};
