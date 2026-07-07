import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  verifyBeforeUpdateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextValue {
  /** The signed-in user, or null if signed out. */
  user: User | null;
  /** True until Firebase has restored the persisted session on launch. */
  initializing: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  /** Sends a confirmation link to the new address; the email doesn't change until it's clicked. */
  changeEmail: (newEmail: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  reauthenticate: (currentPassword: string) => Promise<void>;
}

// onAuthStateChanged only re-fires when the uid changes (sign-in/out), not
// after profile/password updates — so we force a new object reference into
// state ourselves after those, or consumers won't see the change.
// A plain `{ ...user }` spread would drop the SDK's prototype methods
// (getIdToken, reload, ...), since they live on the prototype, not as own
// properties — this clone preserves them.
function cloneUser(u: User): User {
  return Object.assign(Object.create(Object.getPrototypeOf(u)), u) as User;
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

  const refreshUser = () => {
    setUser(auth.currentUser ? cloneUser(auth.currentUser) : null);
  };

  const updateDisplayName = async (name: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Not signed in');
    await updateProfile(current, { displayName: name });
    refreshUser();
  };

  const changeEmail = async (newEmail: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Not signed in');
    await verifyBeforeUpdateEmail(current, newEmail);
  };

  const changePassword = async (newPassword: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Not signed in');
    await updatePassword(current, newPassword);
    refreshUser();
  };

  const reauthenticate = async (currentPassword: string) => {
    const current = auth.currentUser;
    if (!current || !current.email) throw new Error('Not signed in');
    const credential = EmailAuthProvider.credential(current.email, currentPassword);
    await reauthenticateWithCredential(current, credential);
    refreshUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        signUp,
        signIn,
        signOut,
        updateDisplayName,
        changeEmail,
        changePassword,
        reauthenticate,
      }}
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
