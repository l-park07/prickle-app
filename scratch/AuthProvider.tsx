/**
 * AuthProvider — the "foundation" your later phases hook into.
 *
 * Wrap your app root with <AuthProvider> (in Expo Router that's app/_layout.tsx).
 * Then anywhere: const { user, signIn, signOut } = useAuth();
 *
 * The important bit for your local-first design:
 *   user?.uid  is the stable ID you write into the `userId` column of each
 *   local expo-sqlite record. That's the single hook that makes phase-3 cloud
 *   sync trivial later — no data leaves the device until you build that.
 *
 * Place at: context/AuthProvider.tsx (adjust the ./firebase import path).
 */
import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    User,
} from 'firebase/auth';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { auth } from '../src/lib/firebase';

interface AuthContextValue {
  /** The signed-in user, or null if signed out. */
  user: User | null;
  /** True until Firebase has restored the persisted session on launch. */
  initializing: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Fires once on launch (with the persisted user, if any) and on every
    // sign-in / sign-out afterward.
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, initializing, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
}
