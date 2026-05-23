export const DEFAULT_MAPBOX_RENDER_ACCESS_TOKEN =
  'pk.eyJ1IjoibDFicmFoIiwiYSI6ImNtbzhvcms4bTAwb2MyeXB3NzcyYW93Nm0ifQ.jpCK5yv2rGrEe54aBCKzyg';

// Expo only inlines EXPO_PUBLIC_* variables when they are referenced with
// static dot notation. Do not replace these direct references with destructuring
// or dynamic `process.env[...]` access, or the native app bundle can silently
// miss the real Mapbox token and directions token.
//
// The in-app map keeps a dedicated checked-in public render token because the
// Maps SDK can fail with a black surface when a local token is URL- or
// scope-restricted. Use the explicit override only after validating the token
// against the mobile Maps SDK.
const EXPO_PUBLIC_MAPBOX_RENDER_TOKEN_OVERRIDE = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN_OVERRIDE;
const EXPO_PUBLIC_MAPBOX_DIRECTIONS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_DIRECTIONS_ACCESS_TOKEN;

type MapboxEnvSource = {
  [key: string]: string | undefined;
  EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN_OVERRIDE?: string;
  EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?: string;
  EXPO_PUBLIC_MAPBOX_DIRECTIONS_ACCESS_TOKEN?: string;
  MAPBOX_ACCESS_TOKEN?: string;
  MAPBOX_DIRECTIONS_ACCESS_TOKEN?: string;
};

export function resolveMapboxAccessToken(envSource?: MapboxEnvSource | null) {
  const envToken = envSource?.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN_OVERRIDE
    || EXPO_PUBLIC_MAPBOX_RENDER_TOKEN_OVERRIDE;

  return envToken || DEFAULT_MAPBOX_RENDER_ACCESS_TOKEN;
}

export function resolveMapboxDirectionsAccessToken(envSource?: MapboxEnvSource | null) {
  const directionsToken = envSource?.MAPBOX_DIRECTIONS_ACCESS_TOKEN
    || envSource?.EXPO_PUBLIC_MAPBOX_DIRECTIONS_ACCESS_TOKEN
    || EXPO_PUBLIC_MAPBOX_DIRECTIONS_TOKEN;

  if (directionsToken) {
    return directionsToken;
  }

  return DEFAULT_MAPBOX_RENDER_ACCESS_TOKEN;
}
