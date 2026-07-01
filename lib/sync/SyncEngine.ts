import { 
  getActiveUser, 
  getPendingLocalFavorites, 
  getPendingLocalHighlights, 
  getPendingLocalChats,
  markFavoritesAsSynced, 
  markHighlightsAsSynced, 
  markChatsAsSynced,
  applyRemoteFavorites, 
  applyRemoteHighlights, 
  applyRemoteChats,
  updateLastSyncTimestamp 
} from '../sqlite/sqliteDatabase';

const DEFAULT_API_URL = 'https://api-sanctus.onrender.com';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

/**
 * Motor de Sincronização Offline-First (Sync Engine).
 * Gerencia o envio de modificações locais e a recepção de modificações remotas.
 */
export class SyncEngine {
  private static instance: SyncEngine;
  private isSyncing = false;

  private constructor() {}

  static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  /**
   * Executa o ciclo de sincronização
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncEngine] Sincronização já está em andamento. Ignorando...');
      return;
    }

    const user = await getActiveUser();
    if (!user) {
      console.log('[SyncEngine] Nenhum usuário logado localmente. Ignorando sincronização.');
      return;
    }

    this.isSyncing = true;
    console.log(`[SyncEngine] Iniciando ciclo de sincronização para: ${user.email}`);

    try {
      // 1. Coletar alterações locais pendentes
      const pendingFavorites = await getPendingLocalFavorites(user.id);
      const pendingHighlights = await getPendingLocalHighlights(user.id);
      const pendingChats = await getPendingLocalChats(user.id);

      console.log(
        `[SyncEngine] Pendentes localmente: ${pendingFavorites.length} favoritos, ${pendingHighlights.length} grifos, ${pendingChats.length} chats.`
      );

      // 2. Chamar endpoint de sincronização no backend
      const response = await fetch(`${API_URL}/api/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          last_sync_timestamp: user.last_sync_timestamp || 0,
          favorites: pendingFavorites,
          highlights: pendingHighlights,
          chats: pendingChats,
        }),
      });

      if (response.status === 401) {
        console.warn('[SyncEngine] Token expirado ou inválido (401). Necessário relogar.');
        this.isSyncing = false;
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resposta do servidor inválida (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const serverTimestamp = data.server_timestamp;
      const remoteFavorites = data.changes.favorites || [];
      const remoteHighlights = data.changes.highlights || [];
      const remoteChats = data.changes.chats || [];

      console.log(
        `[SyncEngine] Mudanças recebidas do servidor: ${remoteFavorites.length} favoritos, ${remoteHighlights.length} grifos, ${remoteChats.length} chats.`
      );

      // 3. Aplicar mudanças remotas recebidas no SQLite local
      await applyRemoteFavorites(user.id, remoteFavorites);
      await applyRemoteHighlights(user.id, remoteHighlights);
      await applyRemoteChats(user.id, remoteChats);

      // 4. Marcar as alterações locais que enviamos como sincronizadas (ou deletar se for soft delete)
      const syncedFavIds = pendingFavorites.map(f => f.id);
      const syncedHlIds = pendingHighlights.map(h => h.id);
      const syncedChatIds = pendingChats.map(c => c.id);

      await markFavoritesAsSynced(syncedFavIds);
      await markHighlightsAsSynced(syncedHlIds);
      await markChatsAsSynced(syncedChatIds);

      // 5. Atualizar o timestamp de último sync do usuário localmente
      await updateLastSyncTimestamp(user.id, serverTimestamp);

      console.log('[SyncEngine] Ciclo de sincronização concluído com sucesso!');
    } catch (error: any) {
      // Captura erros de rede/conexão de forma silenciosa para não quebrar a experiência offline
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('timeout')
      ) {
        console.log('[SyncEngine] Dispositivo offline ou servidor inacessível. Sync agendado para depois.');
      } else {
        console.error('[SyncEngine] Erro inesperado durante sincronização:', error);
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = SyncEngine.getInstance();
