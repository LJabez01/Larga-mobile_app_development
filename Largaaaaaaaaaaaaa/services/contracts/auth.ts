import type { AppMode } from '@/services/runtime/app-mode';

export type AppRole = 'commuter' | 'driver' | 'admin';

export interface AppSession {
  userId: string;
  role: AppRole;
  displayName: string;
  email: string;
  mode: AppMode;
}

export interface AuthSnapshot {
  status: 'signedOut' | 'signedIn';
  session: AppSession | null;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface PasswordResetInput {
  email: string;
}

export type DemoRole = Extract<AppRole, 'commuter' | 'driver'>;

export interface AuthService {
  getSession(): Promise<AuthSnapshot>;
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void;
  signIn(input: SignInInput): Promise<AuthSnapshot>;
  register(input: RegisterInput): Promise<AuthSnapshot>;
  requestPasswordReset(input: PasswordResetInput): Promise<void>;
  signOut(): Promise<AuthSnapshot>;
  startDemoSession(role: DemoRole): Promise<AuthSnapshot>;
  reset(): Promise<void>;
}

