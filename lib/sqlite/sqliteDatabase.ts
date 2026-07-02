import * as SQLite from 'expo-sqlite';
import { BOOKS } from '../data';
import { todosLivros } from '../bibliaData';
import oracoesJson from '../../data/Rosário/Orações Terço.json';
import { FavoriteParagraph, TextHighlight } from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbQueue: Promise<any> = Promise.resolve();
let initPromise: Promise<void> | null = null;

export async function runInQueue<T>(task: () => Promise<T>): Promise<T> {
  const result = dbQueue.then(task);
  dbQueue = result.catch(() => {});
  return result;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('sanctus.db');
    try {
      await dbInstance.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
      `);
      console.log('[SQLite] Modo WAL e Synchronous Normal ativados com sucesso.');
    } catch (e) {
      console.warn('[SQLite] Erro ao configurar PRAGMAs do banco:', e);
    }
  }
  return dbInstance;
}

export function initializeDatabase(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await getDb();

    // 1. Criar tabela meta e garantir as tabelas de cache diário para suporte offline
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meta (
        chave TEXT PRIMARY KEY,
        valor TEXT
      );
      CREATE TABLE IF NOT EXISTS santos_cache (
        data TEXT PRIMARY KEY,
        conteudo TEXT
      );
      CREATE TABLE IF NOT EXISTS liturgia_cache (
        data TEXT PRIMARY KEY,
        conteudo TEXT
      );
      CREATE TABLE IF NOT EXISTS meditacao_cache (
        data TEXT PRIMARY KEY,
        conteudo TEXT
      );
      CREATE TABLE IF NOT EXISTS curiosidades_cache (
        data TEXT PRIMARY KEY,
        conteudo TEXT
      );
      CREATE TABLE IF NOT EXISTS local_users (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        token TEXT NOT NULL,
        last_sync_timestamp INTEGER DEFAULT 0,
        avatar_url TEXT DEFAULT NULL
      );
      CREATE TABLE IF NOT EXISTS local_favorites (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        book_slug TEXT NOT NULL,
        book_title TEXT,
        chapter_id INTEGER,
        chapter_name TEXT,
        paragraph_number INTEGER NOT NULL,
        paragraph_text TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        group_id TEXT,
        group_range TEXT,
        updated_at INTEGER NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS local_highlights (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        book_slug TEXT NOT NULL,
        chapter_id INTEGER NOT NULL,
        paragraph_number INTEGER NOT NULL,
        start_word_index INTEGER NOT NULL,
        end_word_index INTEGER NOT NULL,
        highlighted_text TEXT NOT NULL,
        color TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        end_paragraph_number INTEGER,
        end_word_index_end INTEGER,
        updated_at INTEGER NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_local_fav_user ON local_favorites(user_id);
      CREATE INDEX IF NOT EXISTS idx_local_hl_user ON local_highlights(user_id);
      CREATE TABLE IF NOT EXISTS local_chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        messages_json TEXT NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_local_chats_user ON local_chats(user_id);

      CREATE TABLE IF NOT EXISTS local_activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        titulo TEXT NOT NULL,
        dia TEXT,
        horario TEXT NOT NULL,
        lembrete_ativo INTEGER DEFAULT 0,
        lembrete_minutos_antes INTEGER DEFAULT 0,
        repetir INTEGER DEFAULT 0,
        frequencia TEXT,
        dias_semana TEXT,
        cor TEXT NOT NULL,
        mensagem_lembrete TEXT,
        icone TEXT DEFAULT NULL,
        updated_at INTEGER NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_local_activities_user ON local_activities(user_id);

      CREATE TABLE IF NOT EXISTS local_activity_exclusions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        activity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_local_exclusions_user ON local_activity_exclusions(user_id);

      CREATE TABLE IF NOT EXISTS local_completions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        activity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_local_completions_user ON local_completions(user_id);
    `);

    try {
      await db.execAsync('ALTER TABLE local_chats ADD COLUMN is_deleted INTEGER DEFAULT 0');
    } catch (e) {}
    try {
      await db.execAsync('ALTER TABLE local_chats ADD COLUMN is_synced INTEGER DEFAULT 0');
    } catch (e) {}
    try {
      await db.execAsync('ALTER TABLE local_users ADD COLUMN avatar_url TEXT DEFAULT NULL');
    } catch (e) {}
    try {
      await db.execAsync("ALTER TABLE local_activities ADD COLUMN terminar_tipo TEXT DEFAULT 'nunca';");
    } catch (e) {}
    try {
      await db.execAsync("ALTER TABLE local_activities ADD COLUMN terminar_vezes INTEGER DEFAULT 0;");
    } catch (e) {}
    try {
      await db.execAsync("ALTER TABLE local_activities ADD COLUMN terminar_data TEXT DEFAULT NULL;");
    } catch (e) {}
    try {
      await db.execAsync("ALTER TABLE local_activities ADD COLUMN icone TEXT DEFAULT NULL;");
    } catch (e) {}

    const result = await db.getFirstAsync<{ valor: string }>(
      "SELECT valor FROM meta WHERE chave = 'migrado'"
    );

    if (result && result.valor === 'true') {
      console.log('[SQLite] Banco de dados já inicializado e migrado.');
      return;
    }

    console.log('[SQLite] Iniciando migração silenciosa dos JSONs para o SQLite...');

    // 2. Criar tabelas
    await db.execAsync(`
      DROP TABLE IF EXISTS biblia;
      DROP TABLE IF EXISTS livros;
      DROP TABLE IF EXISTS oracoes_terco;

      CREATE TABLE IF NOT EXISTS santos_cache (
        data TEXT PRIMARY KEY,
        conteudo TEXT
      );

      CREATE TABLE biblia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        testamento TEXT,
        livro_nome TEXT,
        livro_slug TEXT,
        capitulo INTEGER,
        versiculo INTEGER,
        texto TEXT
      );

      CREATE TABLE livros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_slug TEXT,
        chapter_num INTEGER,
        chapter_name TEXT,
        paragraph_num INTEGER,
        label TEXT,
        text TEXT
      );

      CREATE TABLE oracoes_terco (
        chave TEXT PRIMARY KEY,
        titulo TEXT,
        conteudo TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_biblia_busca ON biblia(texto);
      CREATE INDEX IF NOT EXISTS idx_livros_busca ON livros(text);
      CREATE INDEX IF NOT EXISTS idx_biblia_coords ON biblia(livro_slug, capitulo);
      CREATE INDEX IF NOT EXISTS idx_livros_coords ON livros(book_slug, chapter_num);
    `);

    // 3. Executar inserção em transação para máxima performance
    await db.withTransactionAsync(async () => {
      // A. Migrar Livros (Caminho, Sulco, Forja, Catecismo, Frases de Santos, Via Sacra, Terço)
      console.log('[SQLite] Preparando migração de Livros...');
      const livrosParaInserir: any[] = [];
      for (const book of BOOKS) {
        for (const chapter of book.data.chapters) {
          for (const paragraph of chapter.paragraphs) {
            livrosParaInserir.push([
              book.slug,
              chapter.chapter,
              chapter.name,
              paragraph.number,
              paragraph.label || null,
              paragraph.text
            ]);
          }
        }
      }

      const batchSizeLivros = 100; // 100 * 6 = 600 parâmetros (limite SQLite Android é 999)
      for (let i = 0; i < livrosParaInserir.length; i += batchSizeLivros) {
        const batch = livrosParaInserir.slice(i, i + batchSizeLivros);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const flatParams = batch.reduce((acc: any[], val: any[]) => acc.concat(val), []);
        await db.runAsync(
          `INSERT INTO livros (book_slug, chapter_num, chapter_name, paragraph_num, label, text)
           VALUES ${placeholders}`,
          flatParams
        );
      }

      // B. Migrar Bíblia Sagrada (AT e NT)
      console.log('[SQLite] Preparando migração de Bíblia Sagrada...');
      const versiculosParaInserir: any[] = [];
      for (const livro of todosLivros) {
        for (const capitulo of livro.capitulos) {
          for (const versiculo of capitulo.versiculos) {
            versiculosParaInserir.push([
              livro.testamento,
              livro.nome,
              livro.slug,
              capitulo.capitulo,
              versiculo.versiculo,
              versiculo.texto
            ]);
          }
        }
      }

      const batchSizeBiblia = 100; // 100 * 6 = 600 parâmetros (limite SQLite Android é 999)
      for (let i = 0; i < versiculosParaInserir.length; i += batchSizeBiblia) {
        const batch = versiculosParaInserir.slice(i, i + batchSizeBiblia);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const flatParams = batch.reduce((acc: any[], val: any[]) => acc.concat(val), []);
        await db.runAsync(
          `INSERT INTO biblia (testamento, livro_nome, livro_slug, capitulo, versiculo, texto)
           VALUES ${placeholders}`,
          flatParams
        );
      }

      // C. Migrar Orações do Terço
      console.log('[SQLite] Migrando Orações do Terço...');
      const oracoes = oracoesJson as Record<string, { titulo: string; conteudo: string }>;
      for (const [chave, data] of Object.entries(oracoes)) {
        await db.runAsync(
          `INSERT INTO oracoes_terco (chave, titulo, conteudo)
           VALUES (?, ?, ?)`,
          chave,
          data.titulo,
          data.conteudo
        );
      }

      // D. Salvar flag de migrado
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (chave, valor) VALUES ('migrado', 'true')"
      );
    });

    console.log('[SQLite] Migração concluída com sucesso!');
    } catch (error) {
      console.error('[SQLite] Erro ao migrar banco de dados:', error);
      initPromise = null;
    }
  })();

  return initPromise;
}

// =============================================================================
// CONSULTAS SQL - LIVROS
// =============================================================================

export interface DbBookParagraph {
  paragraph_num: number;
  label: string | null;
  text: string;
}

export interface DbBookChapter {
  chapter_num: number;
  chapter_name: string;
  paragraphs: DbBookParagraph[];
}

export async function getChapterFromDb(bookSlug: string, chapterNum: number): Promise<DbBookChapter | null> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      chapter_name: string;
      paragraph_num: number;
      label: string | null;
      text: string;
    }>(
      `SELECT chapter_name, paragraph_num, label, text 
       FROM livros 
       WHERE book_slug = ? AND chapter_num = ?
       ORDER BY paragraph_num ASC`,
      [bookSlug, chapterNum]
    );

    if (rows.length === 0) return null;

    return {
      chapter_num: chapterNum,
      chapter_name: rows[0].chapter_name,
      paragraphs: rows.map(r => ({
        paragraph_num: r.paragraph_num,
        label: r.label,
        text: r.text
      }))
    };
  } catch (error) {
    console.error(`[SQLite] Erro ao obter capítulo ${chapterNum} do livro ${bookSlug}:`, error);
    return null;
  }
}

export async function searchInBooksFromDb(query: string): Promise<{
  bookSlug: string;
  chapter: number;
  chapterName: string;
  paragraph: number;
  text: string;
}[]> {
  const searchTerm = query.trim();
  if (!searchTerm) return [];

  try {
    const db = await getDb();
    // Usamos LIKE com curingas
    const rows = await db.getAllAsync<{
      book_slug: string;
      chapter_num: number;
      chapter_name: string;
      paragraph_num: number;
      text: string;
    }>(
      `SELECT book_slug, chapter_num, chapter_name, paragraph_num, text
       FROM livros
       WHERE text LIKE ?
       ORDER BY book_slug ASC, chapter_num ASC, paragraph_num ASC
       LIMIT 100`,
      [`%${searchTerm}%`]
    );

    return rows.map(r => ({
      bookSlug: r.book_slug,
      chapter: r.chapter_num,
      chapterName: r.chapter_name,
      paragraph: r.paragraph_num,
      text: r.text
    }));
  } catch (error) {
    console.error('[SQLite] Erro na busca em livros:', error);
    return [];
  }
}

// =============================================================================
// CONSULTAS SQL - BÍBLIA
// =============================================================================

export interface DbBibliaVersiculo {
  versiculo: number;
  texto: string;
}

export interface DbBibliaCapitulo {
  capitulo: number;
  versiculos: DbBibliaVersiculo[];
}

export async function getCapituloBibliaFromDb(livroSlug: string, chapterNum: number): Promise<DbBibliaCapitulo | null> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      versiculo: number;
      texto: string;
    }>(
      `SELECT versiculo, texto 
       FROM biblia 
       WHERE livro_slug = ? AND capitulo = ?
       ORDER BY versiculo ASC`,
      [livroSlug, chapterNum]
    );

    if (rows.length === 0) return null;

    return {
      capitulo: chapterNum,
      versiculos: rows.map(r => ({
        versiculo: r.versiculo,
        texto: r.texto
      }))
    };
  } catch (error) {
    console.error(`[SQLite] Erro ao obter capítulo da Bíblia ${livroSlug} C${chapterNum}:`, error);
    return null;
  }
}

export async function buscarVersiculosFromDb(query: string): Promise<{
  livroNome: string;
  livroSlug: string;
  capitulo: number;
  versiculo: number;
  texto: string;
}[]> {
  const searchTerm = query.trim();
  if (!searchTerm) return [];

  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      livro_nome: string;
      livro_slug: string;
      capitulo: number;
      versiculo: number;
      texto: string;
    }>(
      `SELECT livro_nome, livro_slug, capitulo, versiculo, texto
       FROM biblia
       WHERE texto LIKE ?
       ORDER BY testamento DESC, livro_nome ASC, capitulo ASC, versiculo ASC
       LIMIT 50`,
      [`%${searchTerm}%`]
    );

    return rows.map(r => ({
      livroNome: r.livro_nome,
      livroSlug: r.livro_slug,
      capitulo: r.capitulo,
      versiculo: r.versiculo,
      texto: r.texto
    }));
  } catch (error) {
    console.error('[SQLite] Erro na busca de versículos da Bíblia:', error);
    return [];
  }
}

// =============================================================================
// CONSULTAS SQL - ORAÇÕES DO TERÇO
// =============================================================================

export async function getOracaoTercoFromDb(chave: string): Promise<{ titulo: string; conteudo: string } | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ titulo: string; conteudo: string }>(
      'SELECT titulo, conteudo FROM oracoes_terco WHERE chave = ?',
      [chave]
    );
    return row || null;
  } catch (error) {
    console.error(`[SQLite] Erro ao obter oração do terço ${chave}:`, error);
    return null;
  }
}

// =============================================================================
// CACHES DIÁRIOS (Santo, Liturgia, Meditação, Curiosidades)
// =============================================================================

// --- Santo do Dia ---
export async function saveSantoCache(dateStr: string, contentJson: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO santos_cache (data, conteudo) VALUES (?, ?)',
        [dateStr || '', contentJson || '']
      );
    } catch (error) {
      console.error(`[SQLite] Erro ao salvar cache do santo para data ${dateStr}:`, error);
    }
  });
}

export async function getSantoCache(dateStr: string): Promise<any | null> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ conteudo: string }>(
        'SELECT conteudo FROM santos_cache WHERE data = ?',
        [dateStr || '']
      );
      if (row && row.conteudo) {
        return JSON.parse(row.conteudo);
      }
      return null;
    } catch (error) {
      console.error(`[SQLite] Erro ao buscar cache do santo para data ${dateStr}:`, error);
      return null;
    }
  });
}

// --- Liturgia Diária ---
export async function saveLiturgiaCache(dateStr: string, contentJson: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO liturgia_cache (data, conteudo) VALUES (?, ?)',
        [dateStr || '', contentJson || '']
      );
    } catch (error) {
      console.error(`[SQLite] Erro ao salvar cache da liturgia para data ${dateStr}:`, error);
    }
  });
}

export async function getLiturgiaCache(dateStr: string): Promise<any | null> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ conteudo: string }>(
        'SELECT conteudo FROM liturgia_cache WHERE data = ?',
        [dateStr || '']
      );
      if (row && row.conteudo) {
        return JSON.parse(row.conteudo);
      }
      return null;
    } catch (error) {
      console.error(`[SQLite] Erro ao buscar cache da liturgia para data ${dateStr}:`, error);
      return null;
    }
  });
}

// --- Meditação do Evangelho ---
export async function saveMeditacaoCache(dateStr: string, contentMarkdown: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO meditacao_cache (data, conteudo) VALUES (?, ?)',
        [dateStr || '', contentMarkdown || '']
      );
    } catch (error) {
      console.error(`[SQLite] Erro ao salvar cache da meditação para data ${dateStr}:`, error);
    }
  });
}

export async function getMeditacaoCache(dateStr: string): Promise<string | null> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ conteudo: string }>(
        'SELECT conteudo FROM meditacao_cache WHERE data = ?',
        [dateStr || '']
      );
      return row ? row.conteudo : null;
    } catch (error) {
      console.error(`[SQLite] Erro ao buscar cache da meditação para data ${dateStr}:`, error);
      return null;
    }
  });
}

// --- Curiosidade Diária ---
export async function saveCuriosidadesCache(dateStr: string, contentMarkdown: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO curiosidades_cache (data, conteudo) VALUES (?, ?)',
        [dateStr || '', contentMarkdown || '']
      );
    } catch (error) {
      console.error(`[SQLite] Erro ao salvar cache da curiosidade para data ${dateStr}:`, error);
    }
  });
}

export async function getCuriosidadesCache(dateStr: string): Promise<string | null> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ conteudo: string }>(
        'SELECT conteudo FROM curiosidades_cache WHERE data = ?',
        [dateStr || '']
      );
      return row ? row.conteudo : null;
    } catch (error) {
      console.error(`[SQLite] Erro ao buscar cache da curiosidade para data ${dateStr}:`, error);
      return null;
    }
  });
}


// =============================================================================
// HELPERS DO BANCO LOCAL - CONTAS DE USUÁRIOS E SESSÕES
// =============================================================================

export interface LocalDbUser {
  id: string;
  nome: string;
  email: string;
  token: string;
  last_sync_timestamp: number;
  avatar_url?: string | null;
}

export async function saveLocalUser(user: { id: string; nome: string; email: string; token: string; avatar_url?: string | null }): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      // Limpar usuários anteriores se existirem (apenas um usuário ativo localmente por vez)
      await db.runAsync('DELETE FROM local_users');
      await db.runAsync(
        'INSERT INTO local_users (id, nome, email, token, last_sync_timestamp, avatar_url) VALUES (?, ?, ?, ?, 0, ?)',
        [user.id || '', user.nome || '', user.email || '', user.token || '', user.avatar_url || null]
      );
      console.log('[SQLite] Usuário salvo localmente:', user.email);
    } catch (error) {
      console.error('[SQLite] Erro ao salvar usuário local:', error);
      throw error;
    }
  });
}

export async function getActiveUser(): Promise<LocalDbUser | null> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<LocalDbUser>(
        'SELECT id, nome, email, token, last_sync_timestamp, avatar_url FROM local_users LIMIT 1'
      );
      return row || null;
    } catch (error) {
      console.error('[SQLite] Erro ao carregar usuário ativo local:', error);
      return null;
    }
  });
}

export async function updateLastSyncTimestamp(userId: string, timestamp: number): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.runAsync(
        'UPDATE local_users SET last_sync_timestamp = ? WHERE id = ?',
        [timestamp || 0, userId || '']
      );
    } catch (error) {
      console.error('[SQLite] Erro ao atualizar timestamp de sincronização:', error);
    }
  });
}

export async function clearActiveUser(): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      // Limpar o usuário local e todos os seus dados ao deslogar para segurança de dados
      await db.runAsync('DELETE FROM local_users');
      await db.runAsync('DELETE FROM local_favorites');
      await db.runAsync('DELETE FROM local_highlights');
      await db.runAsync('DELETE FROM local_chats');
      console.log('[SQLite] Sessão e dados do usuário limpos com sucesso.');
    } catch (error) {
      console.error('[SQLite] Erro ao limpar sessão do usuário local:', error);
      throw error;
    }
  });
}

// =============================================================================
// HELPERS DO BANCO LOCAL - FAVORITOS DO USUÁRIO
// =============================================================================

export async function getLocalFavorites(userId: string): Promise<FavoriteParagraph[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string;
      type: string;
      book_slug: string;
      book_title: string | null;
      chapter_id: number | null;
      chapter_name: string | null;
      paragraph_number: number;
      paragraph_text: string;
      timestamp: number;
      group_id: string | null;
      group_range: string | null;
    }>(
      `SELECT id, type, book_slug, book_title, chapter_id, chapter_name, paragraph_number, 
              paragraph_text, timestamp, group_id, group_range 
       FROM local_favorites 
       WHERE user_id = ? AND is_deleted = 0
       ORDER BY timestamp DESC`,
      [userId]
    );

    return rows.map(r => ({
      bookSlug: r.book_slug,
      bookTitle: r.book_title || '',
      chapterId: r.chapter_id || 0,
      chapterName: r.chapter_name || '',
      paragraphNumber: r.paragraph_number,
      paragraphText: r.paragraph_text,
      timestamp: r.timestamp,
      type: r.type as 'biblia' | 'livro' | 'frases',
      groupId: r.group_id || undefined,
      groupRange: r.group_range || undefined
    }));
  } catch (error) {
    console.error('[SQLite] Erro ao carregar favoritos locais:', error);
    return [];
  }
}

// Auxiliar para gerar ID único caso não exista
function getFavoriteIdentityKey(fav: FavoriteParagraph): string {
  if (fav.bookSlug === 'catecismo') {
    return `${fav.bookSlug}-${fav.paragraphNumber}`;
  }
  return `${fav.bookSlug}-${fav.chapterId}-${fav.paragraphNumber}`;
}

export async function addLocalFavorite(userId: string, fav: FavoriteParagraph): Promise<void> {
  try {
    const db = await getDb();
    const id = getFavoriteIdentityKey(fav);
    const now = Date.now();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_favorites 
        (id, user_id, type, book_slug, book_title, chapter_id, chapter_name, paragraph_number, 
         paragraph_text, timestamp, group_id, group_range, updated_at, is_deleted, is_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        id,
        userId,
        fav.type,
        fav.bookSlug,
        fav.bookTitle,
        fav.chapterId,
        fav.chapterName,
        fav.paragraphNumber,
        fav.paragraphText,
        fav.timestamp || now,
        fav.groupId || null,
        fav.groupRange || null,
        now
      ]
    );
  } catch (error) {
    console.error('[SQLite] Erro ao adicionar favorito local:', error);
    throw error;
  }
}

export async function addLocalFavorites(userId: string, favs: FavoriteParagraph[]): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    await db.withTransactionAsync(async () => {
      for (const fav of favs) {
        const id = getFavoriteIdentityKey(fav);
        await db.runAsync(
          `INSERT OR REPLACE INTO local_favorites 
            (id, user_id, type, book_slug, book_title, chapter_id, chapter_name, paragraph_number, 
             paragraph_text, timestamp, group_id, group_range, updated_at, is_deleted, is_synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [
            id,
            userId,
            fav.type,
            fav.bookSlug,
            fav.bookTitle,
            fav.chapterId,
            fav.chapterName,
            fav.paragraphNumber,
            fav.paragraphText,
            fav.timestamp || now,
            fav.groupId || null,
            fav.groupRange || null,
            now
          ]
        );
      }
    });
  } catch (error) {
    console.error('[SQLite] Erro ao adicionar múltiplos favoritos locais:', error);
    throw error;
  }
}

export async function removeLocalFavorite(userId: string, fav: FavoriteParagraph): Promise<void> {
  try {
    const db = await getDb();
    const id = getFavoriteIdentityKey(fav);
    const now = Date.now();
    // Marcar como deletado para sincronizar deleção com o servidor (soft-delete)
    await db.runAsync(
      'UPDATE local_favorites SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE id = ? AND user_id = ?',
      [now, id, userId]
    );
  } catch (error) {
    console.error('[SQLite] Erro ao remover favorito local (soft delete):', error);
    throw error;
  }
}

export async function removeLocalFavorites(userId: string, favs: FavoriteParagraph[]): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    await db.withTransactionAsync(async () => {
      for (const fav of favs) {
        const id = getFavoriteIdentityKey(fav);
        await db.runAsync(
          'UPDATE local_favorites SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE id = ? AND user_id = ?',
          [now, id, userId]
        );
      }
    });
  } catch (error) {
    console.error('[SQLite] Erro ao remover múltiplos favoritos locais:', error);
    throw error;
  }
}

export async function clearAllLocalFavorites(userId: string): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    // Soft-delete de todos para propagar
    await db.runAsync(
      'UPDATE local_favorites SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE user_id = ?',
      [now, userId]
    );
  } catch (error) {
    console.error('[SQLite] Erro ao limpar favoritos locais:', error);
    throw error;
  }
}

// =============================================================================
// HELPERS DO BANCO LOCAL - GRIFOS (HIGHLIGHTS) DO USUÁRIO
// =============================================================================

export async function getLocalHighlights(userId: string): Promise<TextHighlight[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string;
      type: string;
      book_slug: string;
      chapter_id: number;
      paragraph_number: number;
      start_word_index: number;
      end_word_index: number;
      highlighted_text: string;
      color: string;
      timestamp: number;
      end_paragraph_number: number | null;
      end_word_index_end: number | null;
    }>(
      `SELECT id, type, book_slug, chapter_id, paragraph_number, start_word_index, end_word_index, 
              highlighted_text, color, timestamp, end_paragraph_number, end_word_index_end 
       FROM local_highlights 
       WHERE user_id = ? AND is_deleted = 0`,
      [userId]
    );

    return rows.map(r => ({
      id: r.id,
      bookSlug: r.book_slug,
      chapterId: r.chapter_id,
      paragraphNumber: r.paragraph_number,
      startWordIndex: r.start_word_index,
      endWordIndex: r.end_word_index,
      highlightedText: r.highlighted_text,
      color: r.color,
      timestamp: r.timestamp,
      type: r.type as 'biblia' | 'livro',
      endParagraphNumber: r.end_paragraph_number || undefined,
      endWordIndexEnd: r.end_word_index_end || undefined
    }));
  } catch (error) {
    console.error('[SQLite] Erro ao carregar grifos locais:', error);
    return [];
  }
}

export async function addLocalHighlight(userId: string, hl: TextHighlight): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_highlights 
        (id, user_id, type, book_slug, chapter_id, paragraph_number, start_word_index, end_word_index, 
         highlighted_text, color, timestamp, end_paragraph_number, end_word_index_end, updated_at, is_deleted, is_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        hl.id,
        userId,
        hl.type,
        hl.bookSlug,
        hl.chapterId,
        hl.paragraphNumber,
        hl.startWordIndex,
        hl.endWordIndex,
        hl.highlightedText,
        hl.color,
        hl.timestamp || now,
        hl.endParagraphNumber || null,
        hl.endWordIndexEnd || null,
        now
      ]
    );
  } catch (error) {
    console.error('[SQLite] Erro ao adicionar grifo local:', error);
    throw error;
  }
}

export async function removeLocalHighlight(userId: string, id: string): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    await db.runAsync(
      'UPDATE local_highlights SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE id = ? AND user_id = ?',
      [now, id, userId]
    );
  } catch (error) {
    console.error('[SQLite] Erro ao remover grifo local (soft delete):', error);
    throw error;
  }
}

export async function updateLocalHighlightsForChapter(
  userId: string,
  bookSlug: string,
  chapterId: number,
  chapterHighlights: TextHighlight[]
): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();

    // Encontrar todos os IDs dos grifos atualmente ativos no SQLite local para este capítulo
    const rows = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM local_highlights WHERE user_id = ? AND book_slug = ? AND chapter_id = ? AND is_deleted = 0',
      [userId, bookSlug, chapterId]
    );
    const existingIds = new Set(rows.map(r => r.id));
    const newIds = new Set(chapterHighlights.map(h => h.id));

    // Os que estavam no banco mas não estão na nova lista, marcar como deletados (is_deleted = 1)
    const toDelete = Array.from(existingIds).filter(id => !newIds.has(id));

    await db.withTransactionAsync(async () => {
      // Registrar soft delete para os removidos
      for (const id of toDelete) {
        await db.runAsync(
          'UPDATE local_highlights SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE id = ? AND user_id = ?',
          [now, id, userId]
        );
      }

      // Adicionar ou atualizar os grifos recebidos
      for (const hl of chapterHighlights) {
        await db.runAsync(
          `INSERT OR REPLACE INTO local_highlights 
            (id, user_id, type, book_slug, chapter_id, paragraph_number, start_word_index, end_word_index, 
             highlighted_text, color, timestamp, end_paragraph_number, end_word_index_end, updated_at, is_deleted, is_synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [
            hl.id,
            userId,
            hl.type,
            hl.bookSlug,
            hl.chapterId,
            hl.paragraphNumber,
            hl.startWordIndex,
            hl.endWordIndex,
            hl.highlightedText,
            hl.color,
            hl.timestamp || now,
            hl.endParagraphNumber || null,
            hl.endWordIndexEnd || null,
            now
          ]
        );
      }
    });
  } catch (error) {
    console.error('[SQLite] Erro ao atualizar grifos do capítulo:', error);
    throw error;
  }
}

// =============================================================================
// HELPERS PARA O MOTOR DE SINCRONIZAÇÃO (SYNC ENGINE)
// =============================================================================

export async function getPendingLocalFavorites(userId: string): Promise<any[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT id, type, book_slug, book_title, chapter_id, chapter_name, paragraph_number, paragraph_text, timestamp, group_id, group_range, updated_at, is_deleted FROM local_favorites WHERE user_id = ? AND is_synced = 0',
      [userId]
    );
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      book_slug: r.book_slug,
      book_title: r.book_title,
      chapter_id: r.chapter_id,
      chapter_name: r.chapter_name,
      paragraph_number: r.paragraph_number,
      paragraph_text: r.paragraph_text,
      timestamp: r.timestamp,
      group_id: r.group_id,
      group_range: r.group_range,
      updated_at: r.updated_at,
      is_deleted: r.is_deleted === 1
    }));
  } catch (error) {
    console.error('[SQLite] Erro ao buscar favoritos pendentes de sync:', error);
    return [];
  }
}

export async function getPendingLocalHighlights(userId: string): Promise<any[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT id, type, book_slug, chapter_id, paragraph_number, start_word_index, end_word_index, highlighted_text, color, timestamp, end_paragraph_number, end_word_index_end, updated_at, is_deleted FROM local_highlights WHERE user_id = ? AND is_synced = 0',
      [userId]
    );
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      book_slug: r.book_slug,
      chapter_id: r.chapter_id,
      paragraph_number: r.paragraph_number,
      start_word_index: r.start_word_index,
      end_word_index: r.end_word_index,
      highlighted_text: r.highlighted_text,
      color: r.color,
      timestamp: r.timestamp,
      end_paragraph_number: r.end_paragraph_number,
      end_word_index_end: r.end_word_index_end,
      updated_at: r.updated_at,
      is_deleted: r.is_deleted === 1
    }));
  } catch (error) {
    console.error('[SQLite] Erro ao buscar grifos pendentes de sync:', error);
    return [];
  }
}

export async function markFavoritesAsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const id of ids) {
        // Se foi enviado como deletado (is_deleted = 1), após sincronizar podemos remover fisicamente localmente
        const fav = await db.getFirstAsync<{ is_deleted: number }>(
          'SELECT is_deleted FROM local_favorites WHERE id = ?',
          [id]
        );
        if (fav && fav.is_deleted === 1) {
          await db.runAsync('DELETE FROM local_favorites WHERE id = ?', [id]);
        } else {
          await db.runAsync('UPDATE local_favorites SET is_synced = 1 WHERE id = ?', [id]);
        }
      }
    });
  } catch (error) {
    console.error('[SQLite] Erro ao marcar favoritos como sincronizados:', error);
  }
}

export async function markHighlightsAsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const id of ids) {
        const hl = await db.getFirstAsync<{ is_deleted: number }>(
          'SELECT is_deleted FROM local_highlights WHERE id = ?',
          [id]
        );
        if (hl && hl.is_deleted === 1) {
          await db.runAsync('DELETE FROM local_highlights WHERE id = ?', [id]);
        } else {
          await db.runAsync('UPDATE local_highlights SET is_synced = 1 WHERE id = ?', [id]);
        }
      }
    });
  } catch (error) {
    console.error('[SQLite] Erro ao marcar grifos como sincronizados:', error);
  }
}

export async function applyRemoteFavorites(userId: string, remoteFavs: any[]): Promise<void> {
  if (remoteFavs.length === 0) return;
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const fav of remoteFavs) {
        // Verificar se existe favorito local
        const local = await db.getFirstAsync<{ updated_at: number }>(
          'SELECT updated_at FROM local_favorites WHERE id = ? AND user_id = ?',
          [fav.id, userId]
        );

        if (fav.is_deleted) {
          // Deletar fisicamente localmente
          await db.runAsync('DELETE FROM local_favorites WHERE id = ? AND user_id = ?', [fav.id, userId]);
          continue;
        }

        // Se não existir localmente OU o remoto for mais recente
        if (!local || fav.updated_at > local.updated_at) {
          await db.runAsync(
            `INSERT OR REPLACE INTO local_favorites 
              (id, user_id, type, book_slug, book_title, chapter_id, chapter_name, paragraph_number, 
               paragraph_text, timestamp, group_id, group_range, updated_at, is_deleted, is_synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
            [
              fav.id,
              userId,
              fav.type,
              fav.book_slug,
              fav.book_title,
              fav.chapter_id,
              fav.chapter_name,
              fav.paragraph_number,
              fav.paragraph_text,
              fav.timestamp,
              fav.group_id,
              fav.group_range,
              fav.updated_at
            ]
          );
        }
      }
    });
  } catch (error) {
    console.error('[SQLite] Erro ao aplicar favoritos remotos:', error);
  }
}

export async function applyRemoteHighlights(userId: string, remoteHls: any[]): Promise<void> {
  if (remoteHls.length === 0) return;
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const hl of remoteHls) {
        const local = await db.getFirstAsync<{ updated_at: number }>(
          'SELECT updated_at FROM local_highlights WHERE id = ? AND user_id = ?',
          [hl.id, userId]
        );

        if (hl.is_deleted) {
          await db.runAsync('DELETE FROM local_highlights WHERE id = ? AND user_id = ?', [hl.id, userId]);
          continue;
        }

        if (!local || hl.updated_at > local.updated_at) {
          await db.runAsync(
            `INSERT OR REPLACE INTO local_highlights 
              (id, user_id, type, book_slug, chapter_id, paragraph_number, start_word_index, end_word_index, 
               highlighted_text, color, timestamp, end_paragraph_number, end_word_index_end, updated_at, is_deleted, is_synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
            [
              hl.id,
              userId,
              hl.type,
              hl.book_slug,
              hl.chapter_id,
              hl.paragraph_number,
              hl.start_word_index,
              hl.end_word_index,
              hl.highlighted_text,
              hl.color,
              hl.timestamp,
              hl.end_paragraph_number,
              hl.end_word_index_end,
              hl.updated_at
            ]
          );
        }
      }
    });
  } catch (error) {
    console.error('[SQLite] Erro ao aplicar grifos remotos:', error);
  }
}


// =============================================================================
// HELPERS DO BANCO LOCAL - HISTÓRICO DE CHATS DO MAGISTERIUM
// =============================================================================

export async function getLocalChats(userId: string): Promise<any[]> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{
        id: string;
        title: string;
        created_at: number;
        updated_at: number;
        messages_json: string;
      }>(
        'SELECT id, title, created_at, updated_at, messages_json FROM local_chats WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
        [userId || '']
      );

      return rows.map(r => ({
        id: r.id,
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        messages: JSON.parse(r.messages_json || '[]')
      }));
    } catch (error) {
      console.error('[SQLite] Erro ao carregar chats locais:', error);
      return [];
    }
  });
}

export async function saveLocalChat(userId: string, chat: any): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const now = Date.now();
      await db.runAsync(
        `INSERT OR REPLACE INTO local_chats (id, user_id, title, created_at, updated_at, messages_json, is_deleted, is_synced) 
         VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
        [
          chat.id || '',
          userId || '',
          chat.title || '',
          chat.createdAt || now,
          now,
          JSON.stringify(chat.messages || [])
        ]
      );
    } catch (error) {
      console.error('[SQLite] Erro ao salvar chat local:', error);
      throw error;
    }
  });
}

export async function renameLocalChat(userId: string, id: string, title: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const now = Date.now();
      await db.runAsync(
        'UPDATE local_chats SET title = ?, updated_at = ?, is_synced = 0 WHERE id = ? AND user_id = ?',
        [title || '', now, id || '', userId || '']
      );
    } catch (error) {
      console.error('[SQLite] Erro ao renomear chat local:', error);
      throw error;
    }
  });
}

export async function deleteLocalChat(userId: string, id: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const now = Date.now();
      await db.runAsync(
        'UPDATE local_chats SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE id = ? AND user_id = ?',
        [now, id || '', userId || '']
      );
    } catch (error) {
      console.error('[SQLite] Erro ao deletar chat local (soft delete):', error);
      throw error;
    }
  });
}

export async function clearAllLocalChats(userId: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const now = Date.now();
      await db.runAsync(
        'UPDATE local_chats SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE user_id = ?',
        [now, userId || '']
      );
    } catch (error) {
      console.error('[SQLite] Erro ao limpar chats locais (soft delete):', error);
      throw error;
    }
  });
}

export async function getPendingLocalChats(userId: string): Promise<any[]> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{
        id: string;
        title: string;
        created_at: number;
        updated_at: number;
        messages_json: string;
        is_deleted: number;
      }>(
        'SELECT id, title, created_at, updated_at, messages_json, is_deleted FROM local_chats WHERE user_id = ? AND is_synced = 0',
        [userId || '']
      );
      return rows.map(r => ({
        id: r.id,
        title: r.title,
        created_at: r.created_at,
        updated_at: r.updated_at,
        messages_json: r.messages_json,
        is_deleted: r.is_deleted === 1
      }));
    } catch (error) {
      console.error('[SQLite] Erro ao obter chats pendentes:', error);
      return [];
    }
  });
}

export async function markChatsAsSynced(chatIds: string[]): Promise<void> {
  if (chatIds.length === 0) return;
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const id of chatIds) {
          const row = await db.getFirstAsync<{ is_deleted: number }>(
            'SELECT is_deleted FROM local_chats WHERE id = ?',
            [id]
          );
          if (row && row.is_deleted === 1) {
            await db.runAsync('DELETE FROM local_chats WHERE id = ?', [id]);
          } else {
            await db.runAsync('UPDATE local_chats SET is_synced = 1 WHERE id = ?', [id]);
          }
        }
      });
    } catch (error) {
      console.error('[SQLite] Erro ao marcar chats como sincronizados:', error);
    }
  });
}

export async function applyRemoteChats(userId: string, remoteChats: any[]): Promise<void> {
  if (remoteChats.length === 0) return;
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const chat of remoteChats) {
          const local = await db.getFirstAsync<{ updated_at: number }>(
            'SELECT updated_at FROM local_chats WHERE id = ? AND user_id = ?',
            [chat.id, userId]
          );
          if (!local) {
            if (chat.is_deleted) {
              continue;
            }
            await db.runAsync(
              `INSERT INTO local_chats (id, user_id, title, created_at, updated_at, messages_json, is_deleted, is_synced) 
               VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
              [chat.id, userId, chat.title, chat.created_at, chat.updated_at, chat.messages_json]
            );
          } else {
            if (chat.updated_at > local.updated_at) {
              if (chat.is_deleted) {
                await db.runAsync('DELETE FROM local_chats WHERE id = ? AND user_id = ?', [chat.id, userId]);
              } else {
                await db.runAsync(
                  `UPDATE local_chats 
                   SET title = ?, created_at = ?, updated_at = ?, messages_json = ?, is_deleted = 0, is_synced = 1 
                   WHERE id = ? AND user_id = ?`,
                  [chat.title, chat.created_at, chat.updated_at, chat.messages_json, chat.id, userId]
                );
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('[SQLite] Erro ao aplicar chats remotos:', error);
    }
  });
}


export async function getPendingLocalActivities(userId: string): Promise<any[]> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      return await db.getAllAsync(
        'SELECT * FROM local_activities WHERE user_id = ? AND is_synced = 0',
        [userId]
      );
    } catch (error) {
      console.error('[SQLite] Erro ao obter atividades pendentes:', error);
      return [];
    }
  });
}

export async function getPendingLocalCompletions(userId: string): Promise<any[]> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      return await db.getAllAsync(
        'SELECT * FROM local_completions WHERE user_id = ? AND is_synced = 0',
        [userId]
      );
    } catch (error) {
      console.error('[SQLite] Erro ao obter conclusões pendentes:', error);
      return [];
    }
  });
}

export async function markActivitiesAsSynced(activityIds: string[]): Promise<void> {
  if (activityIds.length === 0) return;
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const id of activityIds) {
          const row = await db.getFirstAsync<{ is_deleted: number }>(
            'SELECT is_deleted FROM local_activities WHERE id = ?',
            [id]
          );
          if (row && row.is_deleted === 1) {
            await db.runAsync('DELETE FROM local_activities WHERE id = ?', [id]);
          } else {
            await db.runAsync('UPDATE local_activities SET is_synced = 1 WHERE id = ?', [id]);
          }
        }
      });
    } catch (error) {
      console.error('[SQLite] Erro ao marcar atividades como sincronizadas:', error);
    }
  });
}

export async function markCompletionsAsSynced(completionIds: string[]): Promise<void> {
  if (completionIds.length === 0) return;
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const id of completionIds) {
          const row = await db.getFirstAsync<{ is_deleted: number }>(
            'SELECT is_deleted FROM local_completions WHERE id = ?',
            [id]
          );
          if (row && row.is_deleted === 1) {
            await db.runAsync('DELETE FROM local_completions WHERE id = ?', [id]);
          } else {
            await db.runAsync('UPDATE local_completions SET is_synced = 1 WHERE id = ?', [id]);
          }
        }
      });
    } catch (error) {
      console.error('[SQLite] Erro ao marcar conclusões como sincronizadas:', error);
    }
  });
}

export async function applyRemoteActivities(userId: string, remoteActivities: any[]): Promise<void> {
  if (remoteActivities.length === 0) return;
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const act of remoteActivities) {
          const local = await db.getFirstAsync<{ updated_at: number }>(
            'SELECT updated_at FROM local_activities WHERE id = ? AND user_id = ?',
            [act.id, userId]
          );
          if (!local) {
            if (act.is_deleted) continue;
            await db.runAsync(
              `INSERT INTO local_activities (id, user_id, titulo, dia, horario, lembrete_ativo, 
                                            lembrete_minutos_antes, repetir, frequencia, dias_semana, cor, 
                                            mensagem_lembrete, terminar_tipo, terminar_vezes, terminar_data, 
                                            icone, updated_at, is_deleted, is_synced)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
              [
                act.id,
                userId,
                act.titulo,
                act.dia || null,
                act.horario,
                act.lembrete_ativo ? 1 : 0,
                act.lembrete_minutos_antes || 0,
                act.repetir ? 1 : 0,
                act.frequencia || null,
                act.dias_semana || null,
                act.cor,
                act.mensagem_lembrete || null,
                act.terminar_tipo || 'nunca',
                act.terminar_vezes || 0,
                act.terminar_data || null,
                act.icone || null,
                act.updated_at
              ]
            );
          } else {
            if (act.updated_at > local.updated_at) {
              if (act.is_deleted) {
                await db.runAsync('DELETE FROM local_activities WHERE id = ? AND user_id = ?', [act.id, userId]);
              } else {
                await db.runAsync(
                  `UPDATE local_activities 
                   SET titulo = ?, dia = ?, horario = ?, lembrete_ativo = ?, 
                       lembrete_minutos_antes = ?, repetir = ?, frequencia = ?, dias_semana = ?, 
                       cor = ?, mensagem_lembrete = ?, terminar_tipo = ?, terminar_vezes = ?, 
                       terminar_data = ?, icone = ?, updated_at = ?, is_deleted = 0, is_synced = 1
                   WHERE id = ? AND user_id = ?`,
                  [
                    act.titulo,
                    act.dia || null,
                    act.horario,
                    act.lembrete_ativo ? 1 : 0,
                    act.lembrete_minutos_antes || 0,
                    act.repetir ? 1 : 0,
                    act.frequencia || null,
                    act.dias_semana || null,
                    act.cor,
                    act.mensagem_lembrete || null,
                    act.terminar_tipo || 'nunca',
                    act.terminar_vezes || 0,
                    act.terminar_data || null,
                    act.icone || null,
                    act.updated_at,
                    act.id,
                    userId
                  ]
                );
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('[SQLite] Erro ao aplicar atividades remotas:', error);
    }
  });
}

export async function applyRemoteCompletions(userId: string, remoteCompletions: any[]): Promise<void> {
  if (remoteCompletions.length === 0) return;
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const comp of remoteCompletions) {
          const local = await db.getFirstAsync<{ updated_at: number }>(
            'SELECT updated_at FROM local_completions WHERE id = ? AND user_id = ?',
            [comp.id, userId]
          );
          if (!local) {
            if (comp.is_deleted) continue;
            await db.runAsync(
              `INSERT INTO local_completions (id, user_id, activity_id, data, updated_at, is_deleted, is_synced)
               VALUES (?, ?, ?, ?, ?, 0, 1)`,
              [comp.id, userId, comp.activity_id, comp.data, comp.updated_at]
            );
          } else {
            if (comp.updated_at > local.updated_at) {
              if (comp.is_deleted) {
                await db.runAsync('DELETE FROM local_completions WHERE id = ? AND user_id = ?', [comp.id, userId]);
              } else {
                await db.runAsync(
                  `UPDATE local_completions 
                   SET activity_id = ?, data = ?, updated_at = ?, is_deleted = 0, is_synced = 1
                   WHERE id = ? AND user_id = ?`,
                  [comp.activity_id, comp.data, comp.updated_at, comp.id, userId]
                );
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('[SQLite] Erro ao aplicar conclusões remotas:', error);
    }
  });
}

export async function seedDefaultActivities(userId: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      // Verificar se o usuário já tem alguma atividade cadastrada para evitar duplicar
      const countRow = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM local_activities WHERE user_id = ?',
        [userId]
      );
      if (countRow && countRow.count > 0) {
        console.log('[SQLite] Usuário já possui atividades. Pulando seed padrão.');
        return;
      }

      const presets = [
        {
          titulo: 'Liturgia Diária',
          categoria: 'Práticas',
          horario: '07:00',
          cor: '#4CAF50',
          mensagem: 'Hora da Liturgia Diária! Alimente sua alma com as leituras de hoje.'
        },
        {
          titulo: 'Meditação do Evangelho',
          categoria: 'Meditações',
          horario: '08:00',
          cor: '#894e93',
          mensagem: 'Que tal meditar o Evangelho agora? Abra o Sanctus para fazer sua leitura meditada.'
        },
        {
          titulo: 'Curiosidade Diária',
          categoria: 'Práticas',
          horario: '18:00',
          cor: '#FF9800',
          mensagem: 'Sua curiosidade católica do dia já está disponível. Venha conferir!'
        },
        {
          titulo: 'Terço do Dia',
          categoria: 'Orações',
          horario: '20:00',
          cor: '#c6a656',
          mensagem: 'Hora de rezar o Terço. Dedique este momento a Nossa Senhora.'
        },
        {
          titulo: 'Santo Rosário',
          categoria: 'Orações',
          horario: '15:00',
          cor: '#D32F2F',
          mensagem: 'Momento de oração com o Santo Rosário. Una-se à Igreja na oração.'
        }
      ];

      const timestamp = Date.now();
      await db.withTransactionAsync(async () => {
        for (let i = 0; i < presets.length; i++) {
          const p = presets[i];
          const id = `preset_${userId}_${i}_${timestamp}`;
          await db.runAsync(
            `INSERT INTO local_activities (id, user_id, titulo, dia, horario, lembrete_ativo, 
                                          lembrete_minutos_antes, repetir, frequencia, dias_semana, cor, 
                                          mensagem_lembrete, updated_at, is_deleted, is_synced)
             VALUES (?, ?, ?, NULL, ?, 1, 0, 1, 'diario', NULL, ?, ?, ?, 0, 0)`,
            [
              id,
              userId,
              p.titulo,
              p.horario,
              p.cor,
              p.mensagem,
              timestamp
            ]
          );
        }
      });

      console.log('[SQLite] Atividades padrão inseridas com sucesso para o usuário:', userId);

      // Agendar notificações para essas atividades padrão
      try {
        const { NotificationService } = await import('../services/NotificationService');
        await NotificationService.rescheduleAll(userId);
      } catch (ne) {
        console.error('[SQLite] Erro ao agendar notificações do seed:', ne);
      }

    } catch (error) {
      console.error('[SQLite] Erro no seed de atividades padrão:', error);
    }
  });
}

export async function getLocalActivities(userId: string): Promise<any[]> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      return await db.getAllAsync(
        'SELECT * FROM local_activities WHERE user_id = ? AND is_deleted = 0 ORDER BY horario ASC',
        [userId]
      );
    } catch (error) {
      console.error('[SQLite] Erro ao carregar atividades:', error);
      return [];
    }
  });
}

export async function getLocalCompletions(userId: string): Promise<any[]> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      return await db.getAllAsync(
        'SELECT * FROM local_completions WHERE user_id = ? AND is_deleted = 0',
        [userId]
      );
    } catch (error) {
      console.error('[SQLite] Erro ao carregar conclusões:', error);
      return [];
    }
  });
}

export async function toggleLocalCompletion(userId: string, activityId: string, dateStr: string): Promise<boolean> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const id = `${activityId}_${dateStr}`;
      const timestamp = Date.now();
      
      const existing = await db.getFirstAsync<{ is_deleted: number }>(
        'SELECT is_deleted FROM local_completions WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      
      let isCompletedNow = false;
      if (!existing) {
        await db.runAsync(
          'INSERT INTO local_completions (id, user_id, activity_id, data, updated_at, is_deleted, is_synced) VALUES (?, ?, ?, ?, ?, 0, 0)',
          [id, userId, activityId, dateStr, timestamp]
        );
        isCompletedNow = true;
      } else {
        if (existing.is_deleted === 1) {
          await db.runAsync(
            'UPDATE local_completions SET is_deleted = 0, is_synced = 0, updated_at = ? WHERE id = ? AND user_id = ?',
            [timestamp, id, userId]
          );
          isCompletedNow = true;
        } else {
          await db.runAsync(
            'UPDATE local_completions SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE id = ? AND user_id = ?',
            [timestamp, id, userId]
          );
          isCompletedNow = false;
        }
      }
      return isCompletedNow;
    } catch (error) {
      console.error('[SQLite] Erro ao alternar conclusão de atividade:', error);
      throw error;
    }
  });
}

export async function deleteLocalActivity(userId: string, activityId: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const timestamp = Date.now();
      await db.runAsync(
        'UPDATE local_activities SET is_deleted = 1, is_synced = 0, updated_at = ? WHERE id = ? AND user_id = ?',
        [timestamp, activityId, userId]
      );
      
      try {
        const { NotificationService } = await import('../services/NotificationService');
        await NotificationService.rescheduleAll(userId);
      } catch (ne) {
        console.error('[SQLite] Erro ao reagendar notificações pós deleção:', ne);
      }
    } catch (error) {
      console.error('[SQLite] Erro ao deletar atividade:', error);
      throw error;
    }
  });
}

export async function saveLocalActivity(userId: string, activity: any): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const timestamp = Date.now();
      const existing = await db.getFirstAsync(
        'SELECT id FROM local_activities WHERE id = ? AND user_id = ?',
        [activity.id, userId]
      );
      
      if (!existing) {
        await db.runAsync(
          `INSERT INTO local_activities (id, user_id, titulo, dia, horario, lembrete_ativo, 
                                        lembrete_minutos_antes, repetir, frequencia, dias_semana, cor, 
                                        mensagem_lembrete, terminar_tipo, terminar_vezes, terminar_data, 
                                        icone, updated_at, is_deleted, is_synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [
            activity.id,
            userId,
            activity.titulo,
            activity.dia || null,
            activity.horario,
            activity.lembrete_ativo ? 1 : 0,
            activity.lembrete_minutos_antes || 0,
            activity.repetir ? 1 : 0,
            activity.frequencia || null,
            activity.dias_semana || null,
            activity.cor,
            activity.mensagem_lembrete || null,
            activity.terminar_tipo || 'nunca',
            activity.terminar_vezes || 0,
            activity.terminar_data || null,
            activity.icone || null,
            timestamp
          ]
        );
      } else {
        await db.runAsync(
          `UPDATE local_activities 
           SET titulo = ?, dia = ?, horario = ?, lembrete_ativo = ?, 
               lembrete_minutos_antes = ?, repetir = ?, frequencia = ?, dias_semana = ?, 
               cor = ?, mensagem_lembrete = ?, terminar_tipo = ?, terminar_vezes = ?, 
               terminar_data = ?, icone = ?, updated_at = ?, is_deleted = 0, is_synced = 0
           WHERE id = ? AND user_id = ?`,
          [
            activity.titulo,
            activity.dia || null,
            activity.horario,
            activity.lembrete_ativo ? 1 : 0,
            activity.lembrete_minutos_antes || 0,
            activity.repetir ? 1 : 0,
            activity.frequencia || null,
            activity.dias_semana || null,
            activity.cor,
            activity.mensagem_lembrete || null,
            activity.terminar_tipo || 'nunca',
            activity.terminar_vezes || 0,
            activity.terminar_data || null,
            activity.icone || null,
            timestamp,
            activity.id,
            userId
          ]
        );
      }
      
      try {
        const { NotificationService } = await import('../services/NotificationService');
        await NotificationService.rescheduleAll(userId);
      } catch (ne) {
        console.error('[SQLite] Erro ao reagendar notificações pós salvamento:', ne);
      }
    } catch (error) {
      console.error('[SQLite] Erro ao salvar atividade local:', error);
      throw error;
    }
  });
}

export async function getPendingLocalExclusions(userId: string): Promise<any[]> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      return await db.getAllAsync(
        'SELECT * FROM local_activity_exclusions WHERE user_id = ? AND is_synced = 0',
        [userId]
      );
    } catch (error) {
      console.error('[SQLite] Erro ao obter exclusões pendentes:', error);
      return [];
    }
  });
}

export async function markExclusionsAsSynced(exclusionIds: string[]): Promise<void> {
  if (exclusionIds.length === 0) return;
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const id of exclusionIds) {
          const row = await db.getFirstAsync<{ is_deleted: number }>(
            'SELECT is_deleted FROM local_activity_exclusions WHERE id = ?',
            [id]
          );
          if (row && row.is_deleted === 1) {
            await db.runAsync('DELETE FROM local_activity_exclusions WHERE id = ?', [id]);
          } else {
            await db.runAsync('UPDATE local_activity_exclusions SET is_synced = 1 WHERE id = ?', [id]);
          }
        }
      });
    } catch (error) {
      console.error('[SQLite] Erro ao marcar exclusões como sincronizadas:', error);
    }
  });
}

export async function applyRemoteExclusions(userId: string, remoteExclusions: any[]): Promise<void> {
  if (remoteExclusions.length === 0) return;
  return runInQueue(async () => {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const exc of remoteExclusions) {
          const local = await db.getFirstAsync<{ updated_at: number }>(
            'SELECT updated_at FROM local_activity_exclusions WHERE id = ? AND user_id = ?',
            [exc.id, userId]
          );
          if (!local) {
            if (exc.is_deleted) continue;
            await db.runAsync(
              `INSERT INTO local_activity_exclusions (id, user_id, activity_id, data, updated_at, is_deleted, is_synced)
               VALUES (?, ?, ?, ?, ?, 0, 1)`,
              [exc.id, userId, exc.activity_id, exc.data, exc.updated_at]
            );
          } else {
            if (exc.updated_at > local.updated_at) {
              if (exc.is_deleted) {
                await db.runAsync('DELETE FROM local_activity_exclusions WHERE id = ? AND user_id = ?', [exc.id, userId]);
              } else {
                await db.runAsync(
                  `UPDATE local_activity_exclusions 
                   SET activity_id = ?, data = ?, updated_at = ?, is_deleted = 0, is_synced = 1
                   WHERE id = ? AND user_id = ?`,
                  [exc.activity_id, exc.data, exc.updated_at, exc.id, userId]
                );
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('[SQLite] Erro ao aplicar exclusões remotas:', error);
    }
  });
}

export async function excludeLocalActivity(userId: string, activityId: string, dateStr: string): Promise<void> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      const id = `excl_${activityId}_${dateStr}`;
      const timestamp = Date.now();
      await db.runAsync(
        `INSERT OR REPLACE INTO local_activity_exclusions (id, user_id, activity_id, data, updated_at, is_deleted, is_synced)
         VALUES (?, ?, ?, ?, ?, 0, 0)`,
        [id, userId, activityId, dateStr, timestamp]
      );
    } catch (error) {
      console.error('[SQLite] Erro ao criar exclusão local de atividade:', error);
      throw error;
    }
  });
}

export async function getLocalExclusions(userId: string): Promise<any[]> {
  return runInQueue(async () => {
    try {
      const db = await getDb();
      return await db.getAllAsync(
        'SELECT * FROM local_activity_exclusions WHERE user_id = ? AND is_deleted = 0',
        [userId]
      );
    } catch (error) {
      console.error('[SQLite] Erro ao carregar exclusões:', error);
      return [];
    }
  });
}


