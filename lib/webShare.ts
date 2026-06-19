import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Alert, Platform, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { toastService } from './toastService';

/**
 * Copia texto para a clipboard, com fallback web via navigator.clipboard.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(text);
  } else {
    await Clipboard.setStringAsync(text);
  }
}

/**
 * Compartilha uma view capturada como imagem (nativo) ou compartilha texto (web).
 * @param ref - Ref da view para captura de imagem (usado apenas no nativo)
 * @param textFallback - Texto usado no compartilhamento web ou fallback
 */
export async function shareAsImage(
  ref: React.RefObject<any>,
  textFallback: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    if (navigator.share) {
      await navigator.share({ text: textFallback });
    } else {
      await navigator.clipboard.writeText(textFallback);
      showNotification('Texto copiado para a área de transferência!');
    }
    return;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert('Erro', 'Compartilhamento não disponível');
    return;
  }

  if (ref.current) {
    const uri = await captureRef(ref, {
      format: 'png',
      quality: 1,
    });
    await Sharing.shareAsync(uri, { mimeType: 'image/png' });
  }
}

/**
 * Compartilha texto via share sheet (nativo) ou Web Share API (web).
 */
export async function shareText(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      showNotification('Texto copiado para a área de transferência!');
    }
    return;
  }

  await Share.share({ message: text });
}

/**
 * Exibe notificação de sucesso, compatível com web e nativo.
 */
export function showNotification(message: string, title?: string): void {
  toastService.show(message);
}
