// User Domain Helpers - validates the Firestore user profile shape.
import {
  isAppRole,
  normalizeApprovedRoles,
  normalizePendingRoles,
  resolveActiveRole,
  resolvePrimaryRole,
  type AppRole,
  type SelfServiceRole,
} from '@/lib/domain/auth';

export interface AppUserDocument {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly phoneNumber: string | null;
  readonly approvedRoles: AppRole[];
  readonly pendingRoleRequests: SelfServiceRole[];
  readonly primaryRole: AppRole | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// User Document Guard - validates legacy and modern Firestore user profile role shapes.
export function isAppUserDocument(value: unknown): value is AppUserDocument {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const approvedRoles = normalizeApprovedRoles(candidate.approvedRoles);
  const pendingRoleRequests = normalizePendingRoles(candidate.pendingRoleRequests);
  const primaryRole = resolvePrimaryRole(candidate.primaryRole, approvedRoles, pendingRoleRequests);
  const hasLegacyRole = typeof candidate.role === 'string' && isAppRole(candidate.role);
  const hasModernRoles = Array.isArray(candidate.approvedRoles) && Array.isArray(candidate.pendingRoleRequests);

  return (
    typeof candidate.uid === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.displayName === 'string' &&
    (candidate.phoneNumber === null || typeof candidate.phoneNumber === 'string') &&
    (hasLegacyRole || hasModernRoles) &&
    (primaryRole === null || isAppRole(primaryRole)) &&
    resolveActiveRole(approvedRoles, primaryRole) !== undefined &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}
