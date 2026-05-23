import fs from 'node:fs';
import path from 'node:path';

import { resolveMapboxDirectionsAccessToken } from '@/lib/config/mapbox';
import type { RouteCoordinate } from '@/lib/domain/transport';
import { parseEnvFileContents } from '@/lib/seed/transport-catalog-sync';
import { BASE_ROUTE_TEMPLATE_SEED } from '@/lib/seed/transport-route-templates';

interface DirectionsRouteGeometryResponse {
  routes?: Array<{
    geometry?: {
      type?: string;
      coordinates?: unknown;
    };
  }>;
  code?: string;
  message?: string;
}

const OUTPUT_FILE_PATH = path.resolve(
  process.cwd(),
  'lib/seed/generated/transport-route-geometries.ts',
);

function loadOptionalEnvFile(envFilePath: string) {
  if (!fs.existsSync(envFilePath)) {
    return {};
  }

  return parseEnvFileContents(fs.readFileSync(envFilePath, 'utf8'));
}

function resolveMapboxAccessToken(cwd: string) {
  const envSource = {
    ...loadOptionalEnvFile(path.resolve(cwd, '.env.seed.local')),
    ...loadOptionalEnvFile(path.resolve(cwd, '.env.local')),
    ...process.env,
  };

  return resolveMapboxDirectionsAccessToken(envSource);
}

function isCoordinateArray(value: unknown): value is RouteCoordinate[] {
  return Array.isArray(value)
    && value.length >= 2
    && value.every(
      (coordinate) => Array.isArray(coordinate)
        && coordinate.length === 2
        && typeof coordinate[0] === 'number'
        && Number.isFinite(coordinate[0])
        && typeof coordinate[1] === 'number'
        && Number.isFinite(coordinate[1]),
    );
}

async function fetchRouteGeometry(
  accessToken: string,
  waypoints: RouteCoordinate[],
) {
  const coordinatePath = waypoints
    .map(([longitude, latitude]) => `${longitude},${latitude}`)
    .join(';');
  const requestUrl = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatePath}`);

  requestUrl.searchParams.set('access_token', accessToken);
  requestUrl.searchParams.set('geometries', 'geojson');
  requestUrl.searchParams.set('overview', 'full');
  requestUrl.searchParams.set('steps', 'false');

  const response = await fetch(requestUrl);
  const payload = await response.json() as DirectionsRouteGeometryResponse;

  if (!response.ok) {
    throw new Error(`Mapbox Directions API failed with ${response.status}: ${payload.message ?? payload.code ?? 'Unknown error'}`);
  }

  const coordinates = payload.routes?.[0]?.geometry?.coordinates;

  if (!isCoordinateArray(coordinates)) {
    throw new Error('Mapbox Directions API returned an invalid route geometry payload.');
  }

  return coordinates.map(
    ([longitude, latitude]) => [longitude, latitude] as RouteCoordinate,
  );
}

function formatCoordinate([longitude, latitude]: RouteCoordinate) {
  return `[${longitude.toFixed(6)}, ${latitude.toFixed(6)}]`;
}

function formatGeneratedModule(routeGeometries: Record<string, RouteCoordinate[]>) {
  const entries = Object.entries(routeGeometries)
    .map(([routeId, coordinates]) => {
      const formattedCoordinates = coordinates
        .map((coordinate) => `    ${formatCoordinate(coordinate)},`)
        .join('\n');

      return `  '${routeId}': [\n${formattedCoordinates}\n  ],`;
    })
    .join('\n');

  return `import type { RouteCoordinate } from '@/lib/domain/transport';

// Generated road-following route geometry snapshot.
// Refresh this file with \`npm.cmd run seed:transport:refresh-geometry\`.
export const GENERATED_ROUTE_GEOMETRIES: Record<string, RouteCoordinate[]> = {
${entries}
};
`;
}

async function main() {
  const accessToken = resolveMapboxAccessToken(process.cwd());
  const nextRouteGeometries: Record<string, RouteCoordinate[]> = {};

  for (const route of BASE_ROUTE_TEMPLATE_SEED) {
    const geometry = await fetchRouteGeometry(accessToken, route.waypoints);
    nextRouteGeometries[route.id] = geometry;
    console.log(`Resolved ${route.id} with ${geometry.length} road-aligned coordinates.`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE_PATH, formatGeneratedModule(nextRouteGeometries), 'utf8');
  console.log(`Wrote generated route geometry to ${OUTPUT_FILE_PATH}.`);
}

main().catch((error) => {
  console.error('Failed to refresh transport route geometry:', error);
  process.exitCode = 1;
});
