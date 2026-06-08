// Auth Domain Helpers - validates role values and resolves role-state driven routing.
export const APP_ROLES = ['commuter', 'driver', 'admin'] as const;
export const SELF_SERVICE_ROLES = ['commuter', 'driver'] as const;
export const REGISTERABLE_ROLES = ['Commuter', 'Driver', 'Both'] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];
export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number];
export type AppRoute = '/commuter' | '/driver' | '/admin' | '/role-selection' | '/pending-access';

// App Role Guard - accepts only persisted app roles that are allowed in session state.
export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

// Self-Service Role Guard - limits user-requestable roles to commuter and driver.
export function isSelfServiceRole(role: AppRole): boolean {
  return SELF_SERVICE_ROLES.includes(role as SelfServiceRole);
}

// Registration Role Guard - validates the public registration role selector values.
export function isRegisterableRole(value: string): value is RegisterableRole {
  return REGISTERABLE_ROLES.includes(value as RegisterableRole);
}

// Role Normalizer - converts registration labels into persisted lowercase app roles.
export function normalizeRole(value: 'Commuter' | 'Driver'): AppRole {
  return value === 'Driver' ? 'driver' : 'commuter';
}

// Approved Roles Normalizer - deduplicates stored approved roles and discards unknown values.
export function normalizeApprovedRoles(value: unknown): AppRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((candidate): candidate is AppRole => typeof candidate === 'string' && isAppRole(candidate)))];
}

// Pending Roles Normalizer - deduplicates pending self-service role requests from Firestore data.
export function normalizePendingRoles(value: unknown): SelfServiceRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (candidate): candidate is SelfServiceRole =>
          candidate === 'commuter' || candidate === 'driver',
      ),
    ),
  ];
}

// Primary Role Resolver - chooses the best role identity from preferred, approved, and pending role state.
export function resolvePrimaryRole(
  preferredRole: unknown,
  approvedRoles: AppRole[],
  pendingRoles: SelfServiceRole[],
): AppRole | null {
  if (typeof preferredRole === 'string' && isAppRole(preferredRole)) {
    return preferredRole;
  }

  if (approvedRoles.length > 0) {
    return approvedRoles[0];
  }

  if (pendingRoles.includes('driver')) {
    return 'driver';
  }

  if (pendingRoles.includes('commuter')) {
    return 'commuter';
  }

  return null;
}

// Active Role Resolver - chooses the usable role for the current signed-in session.
export function resolveActiveRole(
  approvedRoles: AppRole[],
  primaryRole: AppRole | null,
): AppRole | null {
  if (approvedRoles.length === 0) {
    return null;
  }

  if (primaryRole && approvedRoles.includes(primaryRole)) {
    return primaryRole;
  }

  return approvedRoles[0];
}

// Post-Login Route Resolver - maps role approval state to the first screen after authentication.
export function resolveDefaultPostLoginRoute(
  approvedRoles: AppRole[],
  pendingRoles: SelfServiceRole[],
  activeRole: AppRole | null,
): AppRoute {
  if (approvedRoles.includes('admin')) {
    return '/admin';
  }

  if (approvedRoles.length === 0 && pendingRoles.includes('driver')) {
    return '/pending-access';
  }

  if (approvedRoles.length > 1) {
    if (activeRole === 'driver') {
      return '/driver';
    }

    if (activeRole === 'commuter') {
      return '/commuter';
    }

    return '/role-selection';
  }

  return activeRole === 'driver' ? '/driver' : '/commuter';
}
