/**
 * devProfileStore — dev-only "act as this seeded profile" switch.
 *
 * Everything here is wrapped in __DEV__. In a release build Metro's minifier
 * evaluates __DEV__ to false and dead-code-eliminates these branches, so the
 * dev profile ids never reach production. useDevProfile() returns null there.
 */
import { useSyncExternalStore } from 'react';

/** The seeded profiles available in seed-data.json. Dev only. */
export const DEV_PROFILES = ['dev-elizabeth', 'dev-georgie', 'dev-jason'] as const;
export type DevProfile = (typeof DEV_PROFILES)[number];

let current: DevProfile | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Switch which seeded profile the app renders as. No-op outside dev. */
export function setDevProfile(profile: DevProfile | null) {
  if (!__DEV__) return;
  current = profile;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): DevProfile | null {
  return __DEV__ ? current : null;
}

/** Returns the active dev profile, or null (always null in production). */
export function useDevProfile(): DevProfile | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
