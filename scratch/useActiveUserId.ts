/**
 * useActiveUserId — the ONE place that decides which user_id the app queries as.
 *
 * Production:  always the Firebase Auth uid. Nothing else. Period.
 * Development: may be overridden to a seeded dev profile ('dev-elizabeth', ...).
 *
 * Every screen and selector must call this instead of reading `user.uid`
 * directly. That's what makes the dev override a single guarded seam rather
 * than test data scattered through the codebase.
 *
 * Place at: hooks/useActiveUserId.ts
 */
import { useAuth } from '../context/AuthProvider';
import { useDevProfile } from '../dev/devProfileStore';

export function useActiveUserId(): string | null {
  const { user } = useAuth();
  const devProfile = useDevProfile(); // always null when !__DEV__

  if (__DEV__ && devProfile) {
    return devProfile; // e.g. 'dev-elizabeth'
  }
  return user?.uid ?? null;
}
