import { Book, BookData } from './types';

// Importar os JSONs
// Note: These files need to be present in the data folder
import CaminhoData from '../data/Caminho.json';
import ForjaData from '../data/Forja.json';
import SulcoData from '../data/Sulco.json';
import { catecismoAgrupadoBook } from './catecismo';
import { frasesDeSantosBook } from './frasesDeSantos';
import { misteriosTercoBook } from './misteriosTerco';
import { viaSacraBook } from './viaSacra';

// Configuração dos livros com metadados visuais
export const BOOKS: BookData[] = [
  {
    id: '1',
    slug: 'caminho',
    title: 'Caminho',
    author: 'São Josemaria Escrivá',
    description: 'Uma coletânea de 999 pontos de meditação que iluminam o caminho da vida cristã, abordando temas como vocação, oração, trabalho e santidade no dia a dia.',
    color: '#4A90E2',
    gradient: ['#4A90E2', '#357ABD'],
    icon: 'cross',
    data: CaminhoData as Book,
  },
  {
    id: '2',
    slug: 'sulco',
    title: 'Sulco',
    author: 'São Josemaria Escrivá',
    description: 'Continuação de Caminho, com 1000 pontos que aprofundam a espiritualidade cristã, incentivando a fidelidade, perseverança e amor a Deus na vida cotidiana.',
    color: '#E67E22',
    gradient: ['#E67E22', '#D35400'],
    icon: 'barley',
    data: SulcoData as Book,
  },
  {
    id: '3',
    slug: 'forja',
    title: 'Forja',
    author: 'São Josemaria Escrivá',
    description: 'Completa a trilogia com 1055 pontos que forjam a alma cristã no amor divino, abordando a santificação do trabalho, compromisso apostólico e vida de oração.',
    color: '#E74C3C',
    gradient: ['#E74C3C', '#C0392B'],
    icon: 'fire',
    data: ForjaData as Book,
  },
  {
    id: '4',
    slug: 'catecismo',
    title: 'Catecismo da Igreja Católica',
    author: 'Igreja Católica',
    description: 'Exposição orgânica da doutrina católica sobre a fé, os sacramentos, a vida moral e a oração, organizada em parágrafos numerados para estudo e consulta.',
    color: '#4A90E2',
    gradient: ['#4A90E2', '#357ABD'],
    icon: 'church',
    data: catecismoAgrupadoBook,
  },
  {
    id: '6',
    slug: 'frases-de-santos',
    title: 'Frases de Santos',
    author: 'Santos e Beatos',
    description: 'Seleção de frases espirituais de santos e beatos para meditação e inspiração diária.',
    color: '#607D8B',
    gradient: ['#607D8B', '#4F6A75'],
    icon: 'format-quote-close',
    data: frasesDeSantosBook,
  },
  {
    id: '5',
    slug: 'via-sacra',
    title: 'Via Sacra',
    author: 'Tradição Católica',
    description: 'Meditação da Paixão de Cristo em 14 estações, com contemplação, oração e cânticos.',
    color: '#FF5722',
    gradient: ['#FF5722', '#E64A19'],
    icon: 'cross',
    data: viaSacraBook,
  },
  {
    id: '7',
    slug: 'misterios-terco',
    title: 'Mistérios do Rosário',
    author: 'Tradição Católica',
    description: 'Os 20 mistérios do Santo Rosário para meditação: Gozosos, Luminosos, Dolorosos e Gloriosos.',
    color: '#E53935',
    gradient: ['#E53935', '#D32F2F'],
    icon: 'hands-pray',
    data: misteriosTercoBook,
  },
];

// Função auxiliar para obter um livro por slug
export const getBookBySlug = (slug: string): BookData | undefined => {
  return BOOKS.find(book => book.slug === slug);
};

// Função auxiliar para obter um capítulo específico
export const getChapter = (slug: string, chapterId: number) => {
  const book = getBookBySlug(slug);
  if (!book) return null;
  
  return book.data.chapters.find(ch => ch.chapter === chapterId);
};

// Função para buscar em todos os livros
export const searchInBooks = (query: string): {
  book: BookData;
  chapter: number;
  chapterName: string;
  paragraph: number;
  text: string;
}[] => {
  const results: {
    book: BookData;
    chapter: number;
    chapterName: string;
    paragraph: number;
    text: string;
  }[] = [];
  
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return results;

  BOOKS.forEach(book => {
    book.data.chapters.forEach(chapter => {
      chapter.paragraphs.forEach(paragraph => {
        if (paragraph.text.toLowerCase().includes(searchTerm)) {
          results.push({
            book,
            chapter: chapter.chapter,
            chapterName: chapter.name,
            paragraph: paragraph.number,
            text: paragraph.text,
          });
        }
      });
    });
  });

  return results;
};
