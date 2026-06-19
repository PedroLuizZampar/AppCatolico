import { Platform } from 'react-native';

type ToastListener = (message: string, duration?: number) => void;

class ToastManager {
  private listener: ToastListener | null = null;

  subscribe(listener: ToastListener) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  show(message: string, duration = 2000) {
    if (this.listener) {
      this.listener(message, duration);
    } else {
      // Fallback
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        console.log('Toast:', message);
      }
    }
  }
}

export const toastService = new ToastManager();
