// Auth Contracts - defines the shared types and service interface for app authentication.
import type { AppRole, AppRoute, RegisterableRole, SelfServiceRole } from '@/lib/domain/auth';

export type { AppRole, AppRoute, RegisterableRole, SelfServiceRole } from '@/lib/domain/auth';

export interface AppSession {
  userId: string;
  role: AppRole | null;
  displayName: string;
  email: string;
  approvedRoles: AppRole[];
  pendingRoles: SelfServiceRole[];
  primaryRole: AppRole | null;
  availableRoleChoices: AppRole[];
  defaultPostLoginRoute: AppRoute;
  needsRoleSelection: boolean;
  hasPendingAccessOnly: boolean;
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
  requestedRole: RegisterableRole;
  selectedVehicle?: string;
  plateNumber?: string;
  licenseNumber?: string;
  idImageUri?: string | null;
}

export interface PasswordResetInput {
  email: string;
}

export interface AuthService {
  getSession(): Promise<AuthSnapshot>;
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void;
  signIn(input: SignInInput): Promise<AuthSnapshot>;
  register(input: RegisterInput): Promise<AuthSnapshot>;
  requestPasswordReset(input: PasswordResetInput): Promise<void>;
  signOut(): Promise<AuthSnapshot>;
  reset(): Promise<void>;
}
