import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-user, not global: keyed on the real Firebase uid (never
 * useActiveUserId()'s dev-profile override), so a second account signing in
 * on the same device still gets onboarding, and switching dev profiles never
 * yanks the routing guard mid-session.
 */
const key = (uid: string) => `@prickle/onboarding_complete:${uid}`;

export async function isOnboardingComplete(uid: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key(uid));
  return raw === 'true';
}

export async function setOnboardingComplete(uid: string): Promise<void> {
  await AsyncStorage.setItem(key(uid), 'true');
}
