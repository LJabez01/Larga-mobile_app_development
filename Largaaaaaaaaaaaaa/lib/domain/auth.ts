// Auth Domain Helpers - validates role values and resolves role-state driven routing.
export const APP_ROLES = ['commuter', 'driver', 'admin'] as const;
export const SELF_SERVICE_ROLES = ['commuter', 'driver'] as const;
export const REGISTERABLE_ROLES = ['Commuter', 'Driver', 'Both'] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];
export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number];
export type AppRoute = '/commuter' | '/driver' | '/admin' | '/role-selection' | '/pending-access';

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function isSelfServiceRole(role: AppRole): boolean {
  return SELF_SERVICE_ROLES.includes(role as SelfServiceRole);
}

export function isRegisterableRole(value: string): value is RegisterableRole {
  return REGISTERABLE_ROLES.includes(value as RegisterableRole);
}

export function normalizeRole(value: 'Commuter' | 'Driver'): AppRole {
  return value === 'Driver' ? 'driver' : 'commuter';
}

export function normalizeApprovedRoles(value: unknown): AppRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((candidate): candidate is AppRole => typeof candidate === 'string' && isAppRole(candidate)))];
}

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
