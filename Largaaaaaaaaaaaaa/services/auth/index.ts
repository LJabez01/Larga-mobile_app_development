// Auth Service Selector - exports the Firebase auth adapter as the only runtime auth service.
import type { AuthService } from '@/services/contracts/auth';
import { firebaseAuthService } from '@/services/auth/firebase-auth';

export const authService: AuthService = firebaseAuthService;
