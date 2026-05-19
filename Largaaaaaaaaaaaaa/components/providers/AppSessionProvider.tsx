// App Session Provider - exposes the active auth session and auth actions.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authService } from '@/services/auth/index';
import type { AppRole, AppRoute, AppSession, AuthSnapshot, RegisterInput, SignInInput } from '@/services/contracts/auth';

type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface AppSessionContextValue {
  status: SessionStatus;
  session: AppSession | null;
  signIn: (input: SignInInput) => Promise<AuthSnapshot>;
  register: (input: RegisterInput) => Promise<AuthSnapshot>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<AuthSnapshot>;
  selectRole: (role: AppRole) => void;
}

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

// Default Route Helper - maps a signed-in session to its landing screen.
export function getDefaultAppPath(session: AppSession): AppRoute {
  if (session.approvedRoles.includes('admin')) {
    return '/admin';
  }

  if (session.needsRoleSelection && session.role === 'driver') {
    return '/driver';
  }

  if (session.needsRoleSelection && session.role === 'commuter') {
    return '/commuter';
  }

  return session.defaultPostLoginRoute;
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  // Session State - stores the current auth session and loading status for the app.
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [rawSession, setRawSession] = useState<AppSession | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

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
        setRawSession(snapshot.session);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setStatus('signedOut');
        setRawSession(null);
        setSelectedRole(null);
      });

    const unsubscribe = authService.subscribe((snapshot) => {
      if (!mounted) {
        return;
      }

      setStatus(snapshot.status);
      setRawSession(snapshot.session);

      if (snapshot.status === 'signedOut') {
        setSelectedRole(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!rawSession) {
      if (selectedRole !== null) {
        setSelectedRole(null);
      }
      return;
    }

    if (!rawSession.needsRoleSelection) {
      if (selectedRole !== null) {
        setSelectedRole(null);
      }
      return;
    }

    if (selectedRole && rawSession.approvedRoles.includes(selectedRole)) {
      return;
    }

    if (selectedRole !== null) {
      setSelectedRole(null);
    }
  }, [rawSession, selectedRole]);

  const session = useMemo<AppSession | null>(() => {
    if (!rawSession) {
      return null;
    }

    if (!rawSession.needsRoleSelection) {
      return rawSession;
    }

    return {
      ...rawSession,
      role: selectedRole && rawSession.approvedRoles.includes(selectedRole) ? selectedRole : null,
    };
  }, [rawSession, selectedRole]);

  // Context Value - exposes the current session state together with auth actions.
  const value = useMemo<AppSessionContextValue>(
    () => ({
      status,
      session,
      signIn: authService.signIn,
      register: authService.register,
      requestPasswordReset: (email) => authService.requestPasswordReset({ email }),
      signOut: authService.signOut,
      selectRole: (role) => {
        if (!rawSession?.approvedRoles.includes(role)) {
          return;
        }

        setSelectedRole(role);
      },
    }),
    [rawSession, session, status],
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
