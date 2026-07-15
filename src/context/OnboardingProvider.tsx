import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { isOnboardingComplete, setOnboardingComplete } from '../lib/onboardingStore';
import { useAuth } from './AuthProvider';

interface OnboardingContextValue {
  /** null = not yet resolved (or not applicable — no signed-in user). */
  onboardingComplete: boolean | null;
  markOnboardingComplete: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

/** Nested inside AuthProvider — the flag is keyed on the real uid, so it needs `user` in scope. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onboardingComplete, setLocalOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      // Not applicable while signed out — the root layout's `!user` guard
      // branch never consults this, and `ready` must not wait on it either.
      setLocalOnboardingComplete(null);
      return;
    }
    let cancelled = false;
    isOnboardingComplete(user.uid).then((value) => {
      if (!cancelled) setLocalOnboardingComplete(value);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const markOnboardingComplete = async () => {
    if (!user) return;
    await setOnboardingComplete(user.uid);
    setLocalOnboardingComplete(true);
  };

  return (
    <OnboardingContext.Provider value={{ onboardingComplete, markOnboardingComplete }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used inside an <OnboardingProvider>');
  }
  return ctx;
}
