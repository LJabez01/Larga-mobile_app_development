// App Session Provider - exposes the active auth session and auth actions.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authService } from '@/services/auth/index';
import type { AppRole, AppSession, AuthSnapshot, DemoRole, RegisterInput, SignInInput } from '@/services/contracts/auth';
import { getAppMode } from '@/services/runtime/app-mode';

type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface AppSessionContextValue {
  mode: 'mock' | 'firebase';
  isMockMode: boolean;
  status: SessionStatus;
  session: AppSession | null;
  signIn: (input: SignInInput) => Promise<AuthSnapshot>;
  register: (input: RegisterInput) => Promise<AuthSnapshot>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<AuthSnapshot>;
  startDemoSession: (role: DemoRole) => Promise<AuthSnapshot>;
  resetMockState: () => Promise<void>;
}

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

// Default Route Helper - maps a signed-in role to its landing screen.
export function getDefaultAppPath(role: AppRole): '/commuter' | '/driver' {
  return role === 'driver' ? '/driver' : '/commuter';
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  // Session State - stores the current auth session and loading status for the app.
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [session, setSession] = useState<AppSession | null>(null);
  const mode = getAppMode();

  // Session Sync - hydrates the initial auth state and listens for future auth changes.
  useEffect(() => {
    let mounted = true;

    authService
      .getSession()
      .then((snapshot) => {
        if (!mounted) {
          return;
        }

        setStatus(snapshot.status);
        setSession(snapshot.session);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setStatus('signedOut');
        setSession(null);
      });

    const unsubscribe = authService.subscribe((snapshot) => {
      if (!mounted) {
        return;
      }

      setStatus(snapshot.status);
      setSession(snapshot.session);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Context Value - exposes the current session state together with auth actions.
  const value = useMemo<AppSessionContextValue>(
    () => ({
      mode,
      isMockMode: mode === 'mock',
      status,
      session,
      signIn: authService.signIn,
      register: authService.register,
      requestPasswordReset: (email) => authService.requestPasswordReset({ email }),
      signOut: authService.signOut,
      startDemoSession: authService.startDemoSession,
      resetMockState: authService.reset,
    }),
    [mode, session, status],
  );

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  // Context Guard - ensures session consumers are used inside the provider tree.
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error('useAppSession must be used within AppSessionProvider.');
  }

  return context;
}
