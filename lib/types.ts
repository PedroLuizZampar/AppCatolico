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

export interface TextHighlight {
  id: string;                    // ID único (gerado com timestamp)
  bookSlug: string;              // Ex: 'sao-mateus', 'catecismo'
  chapterId: number;             // Número do capítulo
  paragraphNumber: number;       // Número do versículo/parágrafo de início
  startWordIndex: number;        // Índice da primeira palavra grifada
  endWordIndex: number;          // Índice da última palavra no parágrafo de início (inclusive)
  highlightedText: string;       // O texto grifado (para exibição)
  color: string;                 // Cor do grifo (hex base, ex: '#FFF176')
  timestamp: number;             // Quando foi criado
  type: 'biblia' | 'livro';     // Tipo do conteúdo
  // Campos opcionais para grifos cross-parágrafo
  endParagraphNumber?: number;   // Parágrafo de fim (se diferente do início)
  endWordIndexEnd?: number;      // Índice da última palavra no parágrafo de fim
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



