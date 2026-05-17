// User Domain Helpers - validates the Firestore user profile shape.
import { isAppRole, type AppRole } from '@/lib/domain/auth';

export interface AppUserDocument {
  readonly uid: string;
  readonly role: AppRole;
  readonly email: string;
  readonly displayName: string;
  readonly phoneNumber: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function isAppUserDocument(value: unknown): value is AppUserDocument {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.uid === 'string' &&
    typeof candidate.role === 'string' &&
    isAppRole(candidate.role) &&
    typeof candidate.email === 'string' &&
    typeof candidate.displayName === 'string' &&
    (candidate.phoneNumber === null || typeof candidate.phoneNumber === 'string') &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}
