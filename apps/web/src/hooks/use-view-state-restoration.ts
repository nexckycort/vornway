import * as React from 'react';

interface ScrollState {
  scrollY: number;
}

export function useViewStateRestoration<TState extends object>(
  key: string,
  options?: {
    enabled?: boolean;
    onRestore?: (state: TState) => void;
  },
) {
  const enabled = options?.enabled ?? true;
  const onRestore = options?.onRestore;

  const saveViewState = React.useCallback(
    (state: TState) => {
      if (typeof window === 'undefined') return;

      const payload: TState & ScrollState = {
        ...state,
        scrollY: window.scrollY,
      };

      window.sessionStorage.setItem(key, JSON.stringify(payload));
    },
    [key],
  );

  const clearViewState = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(key);
  }, [key]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const rawState = window.sessionStorage.getItem(key);
    if (!rawState) return;

    try {
      const state = JSON.parse(rawState) as TState & ScrollState;
      onRestore?.(state);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: state.scrollY, behavior: 'auto' });
          window.sessionStorage.removeItem(key);
        });
      });
    } catch (error) {
      console.error('Error restoring view state:', error);
      window.sessionStorage.removeItem(key);
    }
  }, [enabled, key, onRestore]);

  return {
    saveViewState,
    clearViewState,
  };
}
