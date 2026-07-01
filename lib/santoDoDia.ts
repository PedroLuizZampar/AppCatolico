import { getSantoCache, saveSantoCache } from './sqlite/sqliteDatabase';

export type SantoContentBlock =
  | { type: 'h2' | 'h3' | 'h4' | 'p' | 'blockquote'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

export type SantoDoDiaToday = {
  day: string | null;
  month: string | null;
  year: string | null;
  title: string | null;
  image: string | null;
  image_caption: string | null;
  content_blocks: SantoContentBlock[] | null;
  full_text: string | null;
  outros_santos: string[] | null;
};

export type SantoDoDiaResponse = {
  objective: string;
  source: 'Canção Nova';
  today: SantoDoDiaToday;
  date?: string;
  isLatestFallback?: boolean;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api-sanctus.onrender.com';

// Função para formatar Date para YYYY-MM-DD no fuso local
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchSantoDoDia(dateObj?: Date): Promise<SantoDoDiaResponse> {
  const targetDate = dateObj || new Date();
  const dateStr = formatDateISO(targetDate);
  
  console.log(`[Santo do Dia] Buscando para data: ${dateStr}`);

  try {
    const url = `${API_BASE_URL}/api/v1/santo-do-dia?date=${dateStr}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('404');
      }
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data: SantoDoDiaResponse = await response.json();
    
    // Salvar cache no SQLite local de forma silenciosa e assíncrona
    if (data && data.today) {
      saveSantoCache(dateStr, JSON.stringify(data)).catch(err =>
        console.error('[SQLite] Falha ao salvar cache do santo:', err)
      );
      return data;
    } else {
      throw new Error('Formato de resposta inválido do servidor.');
    }
  } catch (error: any) {
    console.warn('[Santo do Dia] Erro na API ou rede, tentando obter cache local SQLite:', error);
    
    // Tentar obter do cache local do SQLite
    const cached = await getSantoCache(dateStr);
    if (cached) {
      console.log('[Santo do Dia] Retornando cache local SQLite.');
      return cached;
    }
    
    if (error.message === '404') {
      throw new Error('Não existem registros do Santo do Dia para a data selecionada.');
    }
    
    throw new Error(
      'Não foi possível obter o Santo do Dia da data selecionada. Verifique sua conexão com a internet.'
    );
  }
}
