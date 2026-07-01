import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLocalFavorites, addLocalHighlight, getLocalFavorites, getLocalHighlights } from '../sqlite/sqliteDatabase';
import { FavoriteParagraph, TextHighlight } from '../types';

const LEGACY_FAVORITES_KEY = '@app_catolico_favorites';
const LEGACY_HIGHLIGHTS_KEY = '@app_catolico_highlights';

/**
 * Serviço responsável por migrar dados legados salvos no AsyncStorage de forma anônima
 * para a conta de usuário recém-criada ou logada no banco de dados local SQLite.
 */
export class MigrationService {
  private static instance: MigrationService;

  private constructor() {}

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  /**
   * Executa a migração de dados anônimos antigos para o usuário logado
   * @param userId ID do usuário autenticado
   */
  async migrateLegacyDataIfNeeded(userId: string): Promise<void> {
    try {
      console.log(`[MigrationService] Verificando dados legados para migrar para o usuário: ${userId}`);

      // 1. Migrar Favoritos Legados
      const legacyFavoritesStr = await AsyncStorage.getItem(LEGACY_FAVORITES_KEY);
      if (legacyFavoritesStr) {
        const legacyFavorites: FavoriteParagraph[] = JSON.parse(legacyFavoritesStr);
        if (legacyFavorites && legacyFavorites.length > 0) {
          console.log(`[MigrationService] Encontrados ${legacyFavorites.length} favoritos legados. Migrando...`);
          
          // Adiciona ao SQLite local vinculado ao userId do novo usuário
          await addLocalFavorites(userId, legacyFavorites);
          
          // Limpa chaves legadas para evitar migrações duplicadas no futuro
          await AsyncStorage.removeItem(LEGACY_FAVORITES_KEY);
          console.log('[MigrationService] Favoritos legados migrados com sucesso.');
        }
      }

      // 2. Migrar Grifos Legados
      const legacyHighlightsStr = await AsyncStorage.getItem(LEGACY_HIGHLIGHTS_KEY);
      if (legacyHighlightsStr) {
        const legacyHighlights: TextHighlight[] = JSON.parse(legacyHighlightsStr);
        if (legacyHighlights && legacyHighlights.length > 0) {
          console.log(`[MigrationService] Encontrados ${legacyHighlights.length} grifos legados. Migrando...`);
          
          for (const hl of legacyHighlights) {
            await addLocalHighlight(userId, hl);
          }
          
          await AsyncStorage.removeItem(LEGACY_HIGHLIGHTS_KEY);
          console.log('[MigrationService] Grifos legados migrados com sucesso.');
        }
      }

      console.log('[MigrationService] Verificação e migração de dados legados concluída.');
    } catch (error) {
      console.error('[MigrationService] Erro durante a migração de dados legados:', error);
      // Não lançamos erro para não quebrar o fluxo de login em caso de falha de migração
    }
  }
}

export const migrationService = MigrationService.getInstance();
