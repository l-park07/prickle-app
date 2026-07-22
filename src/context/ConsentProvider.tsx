import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { hasCurrentPrivacyConsent } from '../lib/consent';
import { useAuth } from './AuthProvider';

interface ConsentContextValue {
  /** null = not yet resolved (or not applicable — no signed-in user). */
  consentCurrent: boolean | null;
  refreshConsent: () => Promise<void>;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

/** Nested inside AuthProvider — the flag is keyed on the real uid, so it needs `user` in scope. */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [consentCurrent, setConsentCurrent] = useState<boolean | null>(null);

  const refreshConsent = useCallback(async () => {
    if (!user) {
      // Not applicable while signed out — the root layout's `!user` guard
      // branch never consults this, and `ready` must not wait on it either.
      setConsentCurrent(null);
      return;
    }
    setConsentCurrent(await hasCurrentPrivacyConsent(user.uid));
  }, [user]);

  useEffect(() => {
    refreshConsent();
  }, [refreshConsent]);

  return (
    <ConsentContext.Provider value={{ consentCurrent, refreshConsent }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used inside a <ConsentProvider>');
  }
  return ctx;
}
