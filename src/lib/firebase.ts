import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // getReactNativePersistence works at runtime (Metro resolves the RN build
  // of the SDK) but isn't reachable through firebase/auth's public types:
  // @firebase/auth's exports map matches the "types" condition before the
  // "react-native" condition regardless of Expo's customConditions, so TS
  // always sees the web-only .d.ts. @ts-expect-error (not @ts-ignore) so
  // this starts failing loudly if firebase ever fixes the export ordering.
  // @ts-expect-error
  getReactNativePersistence,
  type Auth,
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

// initializeAuth can only run once per app instance; if Fast Refresh
// re-executes this file's top-level code, fall back to the existing auth.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { app, auth };
