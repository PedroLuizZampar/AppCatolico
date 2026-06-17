import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbQuery } from './db';

/**
 * Obtém a data atual formatada como YYYY-MM-DD no fuso de Brasília
 */
function getTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  return `${year}-${month}-${day}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura os headers de CORS para permitir requisições do App React Native (especialmente na Web)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  try {
    const targetDate = (req.query.date as string) || getTodayDateString();

    // 1. Tentar buscar a curiosidade da data informada
    const result = await dbQuery(
      'SELECT conteudo, data FROM curiosidades_catolicas WHERE data = $1',
      [targetDate]
    );

    if (result.rows.length > 0) {
      return res.status(200).json({
        markdown: result.rows[0].conteudo,
        date: result.rows[0].data,
        isLatestFallback: false
      });
    }

    // 2. Fallback: Buscar a curiosidade mais recente se a de hoje não existir
    const fallbackResult = await dbQuery(
      'SELECT conteudo, data FROM curiosidades_catolicas ORDER BY data DESC LIMIT 1'
    );

    if (fallbackResult.rows.length > 0) {
      return res.status(200).json({
        markdown: fallbackResult.rows[0].conteudo,
        date: fallbackResult.rows[0].data,
        isLatestFallback: true
      });
    }

    // 3. Caso o banco esteja zerado
    return res.status(404).json({
      error: 'Nenhuma curiosidade disponível no momento.'
    });
  } catch (error: any) {
    console.error('[API Curiosidades] Erro ao obter dados:', error);
    return res.status(500).json({
      error: 'Erro interno no servidor ao consultar o banco de dados.',
      details: error.message || error
    });
  }
}
