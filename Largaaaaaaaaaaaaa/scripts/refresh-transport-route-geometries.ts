import fs from 'node:fs';
import path from 'node:path';

import { resolveMapboxDirectionsAccessToken } from '@/lib/config/mapbox';
import {
  getCoordinateDistanceMeters,
  sanitizeOfficialRouteGeometry,
  type RouteCoordinate,
} from '@/lib/domain/route-geometry';
import { parseEnvFileContents } from '@/lib/seed/transport-catalog-sync';
import { GENERATED_ROUTE_GEOMETRIES } from '@/lib/seed/generated/transport-route-geometries';
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
const SANITIZER_ENDPOINT_TOLERANCE_METERS = 35;
const SANITIZER_OPTIONS = {
  adjacencyDuplicateDistanceMeters: 0.5,
  minimumSpacingMeters: 4,
  maxBranchLengthMeters: 450,
  maxRejoinDistanceMeters: 35,
  minimumBranchSpanSegments: 2,
  maxEndpointDriftMeters: 20,
  minimumRetainedDistanceRatio: 0.65,
} as const;

const KNOWN_ROUTE_DETOUR_FIXES = {
  'sta-maria-bayan-halang': {
    anchorBefore: [120.981649, 14.827215] as RouteCoordinate,
    anchorAfter: [120.982102, 14.826351] as RouteCoordinate,
    detourMarker: [120.981458, 14.827047] as RouteCoordinate,
  },
} as const;

// Optional Env Loader - reads a seed env file when available for geometry refresh.
function loadOptionalEnvFile(envFilePath: string) {
  if (!fs.existsSync(envFilePath)) {
    return {};
  }

  return parseEnvFileContents(fs.readFileSync(envFilePath, 'utf8'));
}

// Mapbox Token Resolver - combines seed, local, and process env sources for Directions API calls.
function resolveMapboxAccessToken(cwd: string) {
  const envSource = {
    ...loadOptionalEnvFile(path.resolve(cwd, '.env.seed.local')),
    ...loadOptionalEnvFile(path.resolve(cwd, '.env.local')),
    ...process.env,
  };

  return resolveMapboxDirectionsAccessToken(envSource);
}

// Coordinate Array Guard - validates the GeoJSON coordinate payload shape from Mapbox.
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

// Route Geometry Fetcher - requests full driving geometry from Mapbox for a route waypoint set.
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

// Coordinate Formatter - serializes one coordinate for the generated geometry module.
function formatCoordinate([longitude, latitude]: RouteCoordinate) {
  return `[${longitude.toFixed(6)}, ${latitude.toFixed(6)}]`;
}

// Coordinate Equality Check - compares exact longitude and latitude pairs for known cleanup anchors.
function areCoordinatesEqual(left: RouteCoordinate, right: RouteCoordinate) {
  return left[0] === right[0] && left[1] === right[1];
}

// Known Detour Cleaner - removes manually verified detour slices after automatic sanitizing.
function removeKnownRouteDetours(
  routeId: string,
  coordinates: RouteCoordinate[],
) {
  const detourFix = KNOWN_ROUTE_DETOUR_FIXES[
    routeId as keyof typeof KNOWN_ROUTE_DETOUR_FIXES
  ];

  if (!detourFix) {
    return coordinates;
  }

  const anchorBeforeIndex = coordinates.findIndex((coordinate) => (
    areCoordinatesEqual(coordinate, detourFix.anchorBefore)
  ));
  const anchorAfterIndex = coordinates.findIndex((coordinate) => (
    areCoordinatesEqual(coordinate, detourFix.anchorAfter)
  ));

  if (anchorBeforeIndex === -1 || anchorAfterIndex === -1 || anchorAfterIndex <= anchorBeforeIndex + 1) {
    return coordinates;
  }

  const detourSlice = coordinates.slice(anchorBeforeIndex + 1, anchorAfterIndex);

  if (!detourSlice.some((coordinate) => areCoordinatesEqual(coordinate, detourFix.detourMarker))) {
    return coordinates;
  }

  return [
    ...coordinates.slice(0, anchorBeforeIndex + 1),
    ...coordinates.slice(anchorAfterIndex),
  ];
}

// Generated Module Formatter - writes the refreshed geometry snapshot as a TypeScript module.
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

// Geometry Waypoint Validator - ensures sanitized geometry still starts and ends near the template waypoints.
function validateGeometryAgainstWaypoints(
  routeId: string,
  coordinates: RouteCoordinate[],
  waypoints: RouteCoordinate[],
) {
  if (coordinates.length < 2) {
    throw new Error(`Sanitized geometry for ${routeId} has fewer than two coordinates.`);
  }

  const firstWaypoint = waypoints[0];
  const lastWaypoint = waypoints[waypoints.length - 1];
  const startDriftMeters = getCoordinateDistanceMeters(firstWaypoint, coordinates[0]);
  const endDriftMeters = getCoordinateDistanceMeters(lastWaypoint, coordinates[coordinates.length - 1]);

  if (startDriftMeters > SANITIZER_ENDPOINT_TOLERANCE_METERS) {
    throw new Error(`Sanitized geometry for ${routeId} drifted ${Math.round(startDriftMeters)}m from the first waypoint.`);
  }

  if (endDriftMeters > SANITIZER_ENDPOINT_TOLERANCE_METERS) {
    throw new Error(`Sanitized geometry for ${routeId} drifted ${Math.round(endDriftMeters)}m from the final waypoint.`);
  }
}

// Geometry Refresh Entry Point - refreshes all template route geometries and keeps last-good fallbacks.
async function main() {
  const accessToken = resolveMapboxAccessToken(process.cwd());
  const nextRouteGeometries: Record<string, RouteCoordinate[]> = {};
  const refreshWarnings: string[] = [];

  for (const route of BASE_ROUTE_TEMPLATE_SEED) {
    try {
      const rawGeometry = await fetchRouteGeometry(accessToken, route.waypoints);
      const sanitizedGeometry = sanitizeOfficialRouteGeometry(rawGeometry, SANITIZER_OPTIONS);
      const cleanedGeometry = removeKnownRouteDetours(route.id, sanitizedGeometry.coordinates);

      validateGeometryAgainstWaypoints(route.id, cleanedGeometry, route.waypoints);

      nextRouteGeometries[route.id] = cleanedGeometry;
      console.log(
        `Resolved ${route.id}: ${sanitizedGeometry.rawCoordinateCount} raw -> ${cleanedGeometry.length} cleaned coordinates; removed ${sanitizedGeometry.removedBranchRanges.length} branch ranges.`,
      );
    } catch (error) {
      const previousGeometry = GENERATED_ROUTE_GEOMETRIES[route.id];

      if (!previousGeometry || previousGeometry.length < 2) {
        throw error;
      }

      nextRouteGeometries[route.id] = previousGeometry;
      refreshWarnings.push(
        `Kept last known-good geometry for ${route.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE_PATH, formatGeneratedModule(nextRouteGeometries), 'utf8');
  console.log(`Wrote generated route geometry to ${OUTPUT_FILE_PATH}.`);

  refreshWarnings.forEach((warning) => {
    console.warn(warning);
  });
}

main().catch((error) => {
  console.error('Failed to refresh transport route geometry:', error);
  process.exitCode = 1;
});
