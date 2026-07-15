import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/** Runs `callback` whenever the app transitions from background/inactive to active. */
export function useAppForeground(callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const appState = { current: AppState.currentState };
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        callbackRef.current();
      }
      appState.current = next;
    });
    return () => subscription.remove();
  }, []);
}
