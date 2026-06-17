import { Pool } from 'pg';

// Inicializa o Pool de Conexões do PostgreSQL usando a connection string do Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Obrigatório para conexões SSL com o Neon
  }
});

let tablesInitialized = false;

/**
 * Garante que as tabelas necessárias no banco de dados Neon existam.
 * Se as tabelas não existirem, elas são criadas automaticamente.
 */
export async function ensureTablesExist() {
  if (tablesInitialized) return;

  const createMeditacoesTable = `
    CREATE TABLE IF NOT EXISTS meditacoes_evangelho (
      id SERIAL PRIMARY KEY,
      conteudo TEXT NOT NULL,
      data DATE UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createCuriosidadesTable = `
    CREATE TABLE IF NOT EXISTS curiosidades_catolicas (
      id SERIAL PRIMARY KEY,
      conteudo TEXT NOT NULL,
      data DATE UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const client = await pool.connect();
  try {
    await client.query(createMeditacoesTable);
    await client.query(createCuriosidadesTable);
    tablesInitialized = true;
    console.log('Banco de Dados: Tabelas verificadas/criadas com sucesso.');
  } catch (error) {
    console.error('Banco de Dados: Erro ao verificar ou criar as tabelas:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper para executar consultas SQL genéricas de forma segura
 * garantindo a existência prévia das tabelas.
 */
export async function dbQuery(text: string, params?: any[]) {
  await ensureTablesExist();
  return pool.query(text, params);
}

export default pool;
