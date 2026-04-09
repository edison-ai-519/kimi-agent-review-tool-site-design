import { useSyncExternalStore } from 'react';

function getSnapshot(query: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => undefined;
      }

      const media = window.matchMedia(query);
      const listener = () => onStoreChange();
      media.addEventListener('change', listener);

      return () => media.removeEventListener('change', listener);
    },
    () => getSnapshot(query),
    () => false
  );
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}
