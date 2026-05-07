'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
  ReactNode,
} from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './db';
import { useRouter } from 'next/navigation';

type Role = 'guest' | 'customer' | 'tradesman';

interface AuthContextType {
  user: any | null | undefined;
  setUser: Dispatch<SetStateAction<any | null | undefined>>;
  switchRole: (r: Role) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<any | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        return;
      }

      // Explicitly bind prototype methods that are lost when spreading a class instance
      const boundMethods = {
        getIdToken:              firebaseUser.getIdToken.bind(firebaseUser),
        getIdTokenResult:        firebaseUser.getIdTokenResult.bind(firebaseUser),
        reload:                  firebaseUser.reload.bind(firebaseUser),
        delete:                  firebaseUser.delete.bind(firebaseUser),
      };

      const ref = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'guest',
          createdAt: new Date(),
        });
        setUser({ ...firebaseUser, ...boundMethods, role: 'guest' });
      } else {
        setUser({ ...firebaseUser, ...boundMethods, ...snap.data() });
      }
    });

    return () => unsub();
  }, []);

  const switchRole = async (newRole: Role) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, { role: newRole });
    setUser({ ...user, role: newRole });
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    router.push('/auth/signin');
  };

  const value: AuthContextType = { user, setUser, switchRole, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/**
 * Check if a user has completed onboarding.
 * Used to redirect to onboarding page if needed.
 */
export function isOnboardingComplete(user: any): boolean {
  return user?.onboardingComplete === true;
}

/**
 * Check if a user is a contractor (has a contractors profile).
 * Used to route to contractor or homeowner onboarding.
 */
export async function isContractor(uid: string): Promise<boolean> {
  try {
    const ref = doc(db, 'contractors', uid);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch {
    return false;
  }
}
