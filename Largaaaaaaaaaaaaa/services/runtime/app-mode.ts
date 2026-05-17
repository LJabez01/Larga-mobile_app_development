// App Mode Helper - resolves whether the app should run in mock or firebase mode.
export type AppMode = 'mock' | 'firebase';

const APP_MODE_VALUES = new Set<AppMode>(['mock', 'firebase']);
const DEVELOPMENT_DEFAULT_APP_MODE: AppMode = 'mock';
const PRODUCTION_DEFAULT_APP_MODE: AppMode = 'firebase';

function isAppMode(value: string | undefined): value is AppMode {
  return typeof value === 'string' && APP_MODE_VALUES.has(value as AppMode);
}

function isDevelopmentBuild(): boolean {
  return typeof __DEV__ === 'boolean' && __DEV__;
}

function warnForInvalidAppMode(value: string) {
  console.warn(
    `Ignoring unsupported EXPO_PUBLIC_APP_MODE value "${value}". Valid values are "mock" and "firebase".`,
  );
}

export function resolveAppMode(appModeValue: string | undefined, developmentBuild: boolean): AppMode {
  const normalizedValue = appModeValue?.trim().toLowerCase();

  if (isAppMode(normalizedValue)) {
    return normalizedValue;
  }

  if (normalizedValue) {
    warnForInvalidAppMode(normalizedValue);
  }

  return developmentBuild ? DEVELOPMENT_DEFAULT_APP_MODE : PRODUCTION_DEFAULT_APP_MODE;
}

export function getAppMode(): AppMode {
  return resolveAppMode(process.env.EXPO_PUBLIC_APP_MODE, isDevelopmentBuild());
}

export function isMockMode(): boolean {
  return getAppMode() === 'mock';
}
