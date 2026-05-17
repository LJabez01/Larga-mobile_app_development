// Auth Domain Helpers - validates and normalizes app role values.
export const APP_ROLES = ['commuter', 'driver', 'admin'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function isSelfServiceRole(role: AppRole): boolean {
  return role === 'commuter';
}

export function normalizeRole(value: 'Commuter' | 'Driver'): AppRole {
  return value === 'Driver' ? 'driver' : 'commuter';
}
