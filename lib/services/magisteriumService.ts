import { MagisteriumRequest, MagisteriumResponse, Message } from '../types/magisterium';

const BASE_URL = 'https://www.magisterium.com/api/v1';

export class MagisteriumService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Envia o histórico de mensagens para a API e retorna a resposta com citações e sugestões.
   */
  async sendMessage(history: Message[]): Promise<MagisteriumResponse> {
    const payload: MagisteriumRequest = {
      model: 'magisterium-1',
      messages: history,
      safety_settings: {
        CATEGORY_NON_CATHOLIC: {
          threshold: 'BLOCK_ALL',
          response: true
        }
      }
    };

    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message || 
          `Falha na requisição: ${response.status} ${response.statusText}`
        );
      }

      const data: MagisteriumResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Erro de conexão com o Magisterium AI:', error);
      throw error;
    }
  }
}

// Instância única padrão utilizando a variável de ambiente do Expo
const apiKey = process.env.EXPO_PUBLIC_MAGISTERIUM_API_KEY || '';
export const magisteriumService = new MagisteriumService(apiKey);
