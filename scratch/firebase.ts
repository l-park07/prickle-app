/**
 * Firebase initialization for Prickle.
 * Uses the Firebase JS SDK (firebase v12+). Auth only for now —
 * Firestore/Storage get added in phase 3 when you build cloud sync.
 *
 * Place at: config/firebase.ts (adjust import paths elsewhere to match).
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // NOTE: getReactNativePersistence works at RUNTIME (Metro loads the RN bundle)
  // but is missing from the web type defs in firebase v12, so TypeScript flags it.
  // The @ts-ignore is expected and safe — your app will still persist logins.
  // @ts-ignore
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config comes from EXPO_PUBLIC_ env vars (see .env.example).
// The web apiKey is NOT a secret — real security is Auth + Firestore Rules.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Guard against re-initializing during Fast Refresh.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth can only run once; if Fast Refresh re-runs this file,
// fall back to the already-initialized instance.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export default app;
