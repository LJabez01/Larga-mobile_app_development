import type { AppRole } from '@/lib/domain/auth';

export interface AppUserDocument {
  readonly uid: string;
  readonly role: AppRole;
  readonly email: string;
  readonly displayName: string;
  readonly phoneNumber: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
