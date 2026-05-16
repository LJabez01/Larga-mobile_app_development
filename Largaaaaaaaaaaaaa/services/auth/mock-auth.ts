import { DEMO_USERS } from '@/services/fixtures/users';
import type {
  AppSession,
  AuthService,
  AuthSnapshot,
  DemoRole,
  RegisterInput,
  SignInInput,
} from '@/services/contracts/auth';

const listeners = new Set<(snapshot: AuthSnapshot) => void>();

let currentSnapshot: AuthSnapshot = {
  status: 'signedOut',
  session: null,
};

function notify() {
  listeners.forEach((listener) => listener(currentSnapshot));
}

function buildSession(role: DemoRole, email: string, displayName: string): AppSession {
  return {
    userId: `mock-${role}-${Date.now()}`,
    role,
    email,
    displayName,
    mode: 'mock',
  };
}

function updateSnapshot(snapshot: AuthSnapshot): AuthSnapshot {
  currentSnapshot = snapshot;
  notify();
  return currentSnapshot;
}

function guessRoleFromEmail(email: string): DemoRole {
  return email.toLowerCase().includes('driver') ? 'driver' : 'commuter';
}

function signInWithDemoRole(role: DemoRole, override?: Partial<Pick<AppSession, 'email' | 'displayName'>>): AuthSnapshot {
  const fixture = DEMO_USERS[role];

  return updateSnapshot({
    status: 'signedIn',
    session: buildSession(
      role,
      override?.email ?? fixture.email,
      override?.displayName ?? fixture.displayName,
    ),
  });
}

export const mockAuthService: AuthService = {
  async getSession() {
    return currentSnapshot;
  },

  subscribe(listener) {
    listeners.add(listener);
    listener(currentSnapshot);

    return () => {
      listeners.delete(listener);
    };
  },

  async signIn(input: SignInInput) {
    const role = guessRoleFromEmail(input.email);
    const fixture = DEMO_USERS[role];

    return signInWithDemoRole(role, {
      email: input.email.trim() || fixture.email,
      displayName: fixture.displayName,
    });
  },

  async register(input: RegisterInput) {
    return signInWithDemoRole('commuter', {
      email: input.email.trim(),
      displayName: input.displayName.trim() || DEMO_USERS.commuter.displayName,
    });
  },

  async requestPasswordReset() {
    return;
  },

  async signOut() {
    return updateSnapshot({
      status: 'signedOut',
      session: null,
    });
  },

  async startDemoSession(role: DemoRole) {
    return signInWithDemoRole(role);
  },

  async reset() {
    updateSnapshot({
      status: 'signedOut',
      session: null,
    });
  },
};
