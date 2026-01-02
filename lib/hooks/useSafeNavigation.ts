import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

export function useSafeNavigation() {
  const router = useRouter();
  const isNavigating = useRef(false);

  // Tempo de bloqueio em milissegundos
  const LOCK_TIME = 500;

  const safePush = useCallback((href: any) => {
    if (isNavigating.current) return;

    isNavigating.current = true;
    router.push(href);

    setTimeout(() => {
      isNavigating.current = false;
    }, LOCK_TIME);
  }, [router]);

  const safeReplace = useCallback((href: any) => {
    if (isNavigating.current) return;

    isNavigating.current = true;
    router.replace(href);

    setTimeout(() => {
      isNavigating.current = false;
    }, LOCK_TIME);
  }, [router]);

  const safeBack = useCallback(() => {
    if (isNavigating.current) return;

    isNavigating.current = true;
    router.back();

    setTimeout(() => {
      isNavigating.current = false;
    }, LOCK_TIME);
  }, [router]);

  return { push: safePush, replace: safeReplace, back: safeBack };
}
