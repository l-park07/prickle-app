// Records and reads the user's agreement to the privacy policy, and (separately)
// their explicit opt-in to Cloud Sync of health data. Stored locally with
// AsyncStorage — no server round-trip needed, and it works offline.
//
// Two distinct consents on purpose:
//   1. Privacy policy    — required to use the app at all (captured at onboarding).
//   2. Cloud Sync        — optional, off by default, explicit consent for health
//                          data to leave the device. GDPR Art. 9(2)(a).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIVACY_POLICY_VERSION } from '../constants/privacy';
import { setMailPref } from './mailPrefs';

// Keyed per Firebase uid — mirrors onboardingStore.ts's per-uid keying — so a
// second account signing in on the same device never inherits the first
// account's consent record.
const privacyConsentKey = (uid: string) => `@prickle/privacy_consent:${uid}`;
const cloudSyncConsentKey = (uid: string) => `@prickle/cloud_sync_consent:${uid}`;

// Deliberately NOT per-uid: this checkbox is shown and can be toggled on the
// signup form, before an account (and uid) exists. It's a local "pending
// preference" that gets pushed to Firestore once a uid is available — either
// immediately (toggled after sign-in, e.g. in Settings) or as a one-time
// catch-up right after account creation (see sign-up.tsx).
const EMAIL_UPDATES_KEY = '@prickle/email_updates_opt_in';

export type ConsentRecord = {
  version: string;      // the PRIVACY_POLICY_VERSION agreed to
  acceptedAt: string;   // ISO timestamp
};

/* ----------------------------- Privacy policy ----------------------------- */

export async function recordPrivacyConsent(uid: string): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    version: PRIVACY_POLICY_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(privacyConsentKey(uid), JSON.stringify(record));
  return record;
}

export async function getPrivacyConsent(uid: string): Promise<ConsentRecord | null> {
  const raw = await AsyncStorage.getItem(privacyConsentKey(uid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }
}

/**
 * True only if the user has consented AND it matches the current policy version.
 * Use this to decide whether to re-prompt after a material policy change:
 * bump PRIVACY_POLICY_VERSION in an app release and this flips to false.
 */
export async function hasCurrentPrivacyConsent(uid: string): Promise<boolean> {
  const record = await getPrivacyConsent(uid);
  return record?.version === PRIVACY_POLICY_VERSION;
}

/* ------------------------------- Cloud Sync ------------------------------- */

export async function recordCloudSyncConsent(uid: string): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    version: PRIVACY_POLICY_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(cloudSyncConsentKey(uid), JSON.stringify(record));
  return record;
}

export async function getCloudSyncConsent(uid: string): Promise<ConsentRecord | null> {
  const raw = await AsyncStorage.getItem(cloudSyncConsentKey(uid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }
}

/** Called when the user turns Cloud Sync OFF (withdraws consent). */
export async function clearCloudSyncConsent(uid: string): Promise<void> {
  await AsyncStorage.removeItem(cloudSyncConsentKey(uid));
}

/* --------------------------- App update emails ---------------------------- */
//
// A simple opt-in preference (default OFF). Set at account creation, changeable
// in settings. `uid` is optional because this can be toggled before an account
// exists (see the note on EMAIL_UPDATES_KEY above) — pass it whenever you have
// one so the sync happens immediately.

export async function getEmailUpdatesOptIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(EMAIL_UPDATES_KEY)) === 'true';
}

export async function setEmailUpdatesOptIn(optedIn: boolean, uid?: string): Promise<void> {
  await AsyncStorage.setItem(EMAIL_UPDATES_KEY, optedIn ? 'true' : 'false');
  if (uid) await syncEmailUpdatesPref(uid, optedIn);
}

/** Persists the opt-in to Firestore's mail_prefs/{uid}, where sending reads it from. */
async function syncEmailUpdatesPref(uid: string, optedIn: boolean): Promise<void> {
  await setMailPref(uid, optedIn);
}
