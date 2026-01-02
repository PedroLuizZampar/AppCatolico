import { Biblia, LivroBiblico } from './types';
// Note: This file needs to be present in the data folder
import bibliaDataRaw from '../data/bibliaAveMaria.json';

const bibliaData = bibliaDataRaw as any;

// Função para criar slug a partir do nome
function createSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Processar dados da Bíblia
function processBibliaData(): Biblia {
  const antigoTestamento: LivroBiblico[] = (bibliaData.antigoTestamento || []).map((livro: any) => ({
    ...livro,
    slug: createSlug(livro.nome),
    testamento: 'Antigo' as const,
  }));

  const novoTestamento: LivroBiblico[] = (bibliaData.novoTestamento || []).map((livro: any) => ({
    ...livro,
    slug: createSlug(livro.nome),
    testamento: 'Novo' as const,
  }));

  return {
    antigoTestamento,
    novoTestamento,
  };
}

// Dados processados da Bíblia
export const biblia = processBibliaData();

// Todos os livros (AT + NT)
export const todosLivros: LivroBiblico[] = [
  ...biblia.antigoTestamento,
  ...biblia.novoTestamento,
];

// Buscar livro por slug
export function getLivroBiblicoBySlug(slug: string): LivroBiblico | undefined {
  return todosLivros.find(livro => livro.slug === slug);
}

// Buscar capítulo de um livro
export function getCapituloBiblia(livroSlug: string, capitulo: number): any {
  const livro = getLivroBiblicoBySlug(livroSlug);
  if (!livro) return null;
  
  return livro.capitulos.find(cap => cap.capitulo === capitulo);
}

// Estatísticas da Bíblia
export const bibliaStats = {
  totalLivros: todosLivros.length,
  livrosAT: biblia.antigoTestamento.length,
  livrosNT: biblia.novoTestamento.length,
  totalCapitulos: todosLivros.reduce((sum, livro) => sum + livro.capitulos.length, 0),
  totalVersiculos: todosLivros.reduce((sum, livro) => 
    sum + livro.capitulos.reduce((capSum, cap) => capSum + cap.versiculos.length, 0), 0
  ),
};

// Buscar versículos (para busca e favoritos)
export function buscarVersiculos(query: string): Array<{
  livro: string;
  capitulo: number;
  versiculo: number;
  texto: string;
}> {
  const results: Array<{
    livro: string;
    capitulo: number;
    versiculo: number;
    texto: string;
  }> = [];

  const searchTerm = query.toLowerCase();

  for (const livro of todosLivros) {
    for (const capitulo of livro.capitulos) {
      for (const versiculo of capitulo.versiculos) {
        if (versiculo.texto.toLowerCase().includes(searchTerm)) {
          results.push({
            livro: livro.nome,
            capitulo: capitulo.capitulo,
            versiculo: versiculo.versiculo,
            texto: versiculo.texto,
          });

          // Limitar resultados
          if (results.length >= 50) {
            return results;
          }
        }
      }
    }
  }
  return results;
}
