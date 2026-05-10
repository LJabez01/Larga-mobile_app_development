import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { auth } from '@/firebase';
import type { AppRole } from '@/lib/domain/auth';
import type { AppUserDocument } from '@/lib/domain/users';
import { getAuthErrorMessage } from '@/services/auth';
import { ensureUserDocument, getUserDocument } from '@/services/users';

type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthSessionValue {
  readonly status: SessionStatus;
  readonly firebaseUser: User | null;
  readonly profile: AppUserDocument | null;
  readonly errorMessage: string | null;
  readonly refreshProfile: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionValue | undefined>(undefined);

export function getDefaultAppPath(role: AppRole): '/commuter' | '/driver' {
  return role === 'driver' ? '/driver' : '/commuter';
}

export function AuthSessionProvider({ children }: { readonly children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserDocument | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setErrorMessage(null);

      if (!user) {
        setProfile(null);
        setStatus('signedOut');
        return;
      }

      setStatus('loading');

      try {
        const nextProfile = await ensureUserDocument(user);
        setProfile(nextProfile);
        setStatus('signedIn');
      } catch (error) {
        await signOut(auth).catch(() => {});
        setProfile(null);
        setStatus('signedOut');
        setErrorMessage(getAuthErrorMessage(error));
      }
    });

    return unsubscribe;
  }, []);

  async function refreshProfile() {
    if (!firebaseUser) {
      setProfile(null);
      setStatus('signedOut');
      return;
    }

    try {
      const nextProfile = (await getUserDocument(firebaseUser.uid)) ?? (await ensureUserDocument(firebaseUser));
      setProfile(nextProfile);
      setStatus('signedIn');
      setErrorMessage(null);
    } catch (error) {
      await signOut(auth).catch(() => {});
      setProfile(null);
      setStatus('signedOut');
      setErrorMessage(getAuthErrorMessage(error));
    }
  }

  return (
    <AuthSessionContext.Provider
      value={{
        status,
        firebaseUser,
        profile,
        errorMessage,
        refreshProfile,
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionValue {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSession must be used within AuthSessionProvider.');
  }

  return context;
}
