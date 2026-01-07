// Tipos do sistema
export interface Paragraph {
  number: number;
  text: string;
  label?: string;
}

export interface Chapter {
  chapter: number;
  name: string;
  paragraphs: Paragraph[];
}

export interface BookMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modDate: string;
}

export interface Book {
  file: {
    name: string;
    path: string;
    size_bytes: number;
    pages: number;
  };
  metadata: BookMetadata;
  chapters: Chapter[];
}

export interface BookData {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  color: string;
  gradient: [string, string];
  icon: string;
  data: Book;
}

export interface FavoriteParagraph {
  bookSlug: string;
  bookTitle: string;
  chapterId: number;
  chapterName: string;
  paragraphNumber: number;
  paragraphText: string;
  timestamp: number;
  type: 'biblia' | 'livro' | 'frases'; // Tipo para categorização
  groupId?: string; // ID para agrupar múltiplos favoritos salvos juntos
  groupRange?: string; // Descrição do range (ex: "1-5" para parágrafos 1 a 5)
}

// Tipos da Bíblia
export interface Versiculo {
  versiculo: number;
  texto: string;
}

export interface CapituloBiblia {
  capitulo: number;
  versiculos: Versiculo[];
}

export interface LivroBiblico {
  nome: string;
  slug: string;
  capitulos: CapituloBiblia[];
  testamento: 'Antigo' | 'Novo';
}

export interface Biblia {
  antigoTestamento: LivroBiblico[];
  novoTestamento: LivroBiblico[];
}
