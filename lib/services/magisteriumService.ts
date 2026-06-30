import { MagisteriumRequest, MagisteriumResponse, Message } from '../types/magisterium';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api-sanctus.onrender.com';
const SANCTUS_APP_TOKEN = process.env.EXPO_PUBLIC_SANCTUS_APP_TOKEN || '';

export class MagisteriumService {
  /**
   * Envia o histórico de mensagens para a API do proxy backend que encaminha para o Magisterium AI.
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
      const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'x-sanctus-token': SANCTUS_APP_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = 
          errorData?.detail?.error?.message || 
          errorData?.detail || 
          `Falha na requisição: ${response.status} ${response.statusText}`;
        
        throw new Error(errorMessage);
      }

      const data: MagisteriumResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Erro de conexão com o Magisterium AI através do proxy:', error);
      throw error;
    }
  }
}

// Instância única padrão do serviço
export const magisteriumService = new MagisteriumService();
