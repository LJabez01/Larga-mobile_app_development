export type AppMode = 'mock' | 'firebase';

const DEFAULT_APP_MODE: AppMode = 'firebase';

export function getAppMode(): AppMode {
  const value = process.env.EXPO_PUBLIC_APP_MODE?.trim().toLowerCase();

  if (value === 'mock' || value === 'firebase') {
    return value;
  }

  return DEFAULT_APP_MODE;
}

export function isMockMode(): boolean {
  return getAppMode() === 'mock';
}

