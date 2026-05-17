// Auth Service Selector - chooses the active auth adapter for the current app mode.
import type { AuthService } from '@/services/contracts/auth';
import { isMockMode } from '@/services/runtime/app-mode';

export const authService: AuthService = isMockMode()
  ? (require('./mock-auth') as { mockAuthService: AuthService }).mockAuthService
  : (require('./firebase-auth') as { firebaseAuthService: AuthService }).firebaseAuthService;
