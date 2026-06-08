export type RouteCoordinate = [number, number];

export interface RouteProjection {
  coordinate: RouteCoordinate;
  segmentIndex: number;
  distanceDegrees: number;
  distanceMeters: number;
}

export interface SliceRouteFromProjectionResult {
  remainingCoordinates: RouteCoordinate[];
  progressSegmentIndex: number | null;
  snappedCoordinate: RouteCoordinate;
}

export interface RouteBranchRange {
  startIndex: number;
  endIndex: number;
  branchLengthMeters: number;
  rejoinDistanceMeters: number;
}

export interface RouteGeometrySanitizerOptions {
  adjacencyDuplicateDistanceMeters?: number;
  minimumSpacingMeters?: number;
  maxBranchLengthMeters?: number;
  maxRejoinDistanceMeters?: number;
  minimumBranchSpanSegments?: number;
  maxSelfReturningLoopLengthMeters?: number;
  maxSelfReturningLoopRejoinDistanceMeters?: number;
  minimumSelfReturningLoopSpanSegments?: number;
  maxEndpointDriftMeters?: number;
  minimumRetainedDistanceRatio?: number;
}

export interface SanitizedRouteGeometryResult {
  coordinates: RouteCoordinate[];
  removedBranchRanges: RouteBranchRange[];
  removedSelfReturningLoopRanges: RouteBranchRange[];
  removedAdjacentDuplicates: number;
  removedSpacingCoordinates: number;
  rawCoordinateCount: number;
  sanitizedCoordinateCount: number;
  rawDistanceMeters: number;
  sanitizedDistanceMeters: number;
}

// Radian Converter - converts degree coordinates into radians for spherical math.
function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

// Degree Converter - converts radian bearings back into map-friendly degrees.
function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

// Coordinate Distance - measures raw longitude/latitude distance for projection comparisons.
export function getCoordinateDistance(
  left: RouteCoordinate,
  right: RouteCoordinate,
) {
  const longitudeDistance = left[0] - right[0];
  const latitudeDistance = left[1] - right[1];

  return Math.sqrt((longitudeDistance ** 2) + (latitudeDistance ** 2));
}

// Coordinate Distance Meters - measures real-world distance between two route coordinates.
export function getCoordinateDistanceMeters(
  left: RouteCoordinate,
  right: RouteCoordinate,
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(right[1] - left[1]);
  const longitudeDelta = toRadians(right[0] - left[0]);
  const leftLatitude = toRadians(left[1]);
  const rightLatitude = toRadians(right[1]);
  const a = (Math.sin(latitudeDelta / 2) ** 2)
    + (Math.cos(leftLatitude) * Math.cos(rightLatitude) * (Math.sin(longitudeDelta / 2) ** 2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

// Coordinate Equality - compares exact route coordinates before merging or slicing geometry.
export function areCoordinatesEqual(left: RouteCoordinate, right: RouteCoordinate) {
  return left[0] === right[0] && left[1] === right[1];
}

// Segment Bearing - calculates compass heading for a route segment when the segment has length.
export function getSegmentBearingDegrees(
  segmentStart: RouteCoordinate,
  segmentEnd: RouteCoordinate,
) {
  const latitudeDelta = toRadians(segmentEnd[1] - segmentStart[1]);
  const longitudeDelta = toRadians(segmentEnd[0] - segmentStart[0]);

  if (latitudeDelta === 0 && longitudeDelta === 0) {
    return null;
  }

  const startLatitude = toRadians(segmentStart[1]);
  const endLatitude = toRadians(segmentEnd[1]);
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x = (Math.cos(startLatitude) * Math.sin(endLatitude))
    - (Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta));
  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;

  return Number.isFinite(bearing) ? bearing : null;
}

// Bearing Delta - returns the smallest angular difference between two headings.
export function getBearingDeltaDegrees(leftBearing: number, rightBearing: number) {
  const delta = Math.abs(leftBearing - rightBearing);

  return Math.min(delta, 360 - delta);
}

// Segment Projection - snaps a coordinate to the closest point on one route segment.
export function projectCoordinateOntoSegment(
  coordinate: RouteCoordinate,
  segmentStart: RouteCoordinate,
  segmentEnd: RouteCoordinate,
): RouteCoordinate {
  const segmentLongitude = segmentEnd[0] - segmentStart[0];
  const segmentLatitude = segmentEnd[1] - segmentStart[1];
  const segmentLengthSquared = (segmentLongitude ** 2) + (segmentLatitude ** 2);

  if (segmentLengthSquared === 0) {
    return segmentStart;
  }

  const coordinateLongitude = coordinate[0] - segmentStart[0];
  const coordinateLatitude = coordinate[1] - segmentStart[1];
  const projection = ((coordinateLongitude * segmentLongitude) + (coordinateLatitude * segmentLatitude)) / segmentLengthSquared;
  const clampedProjection = Math.min(Math.max(projection, 0), 1);

  return [
    segmentStart[0] + (segmentLongitude * clampedProjection),
    segmentStart[1] + (segmentLatitude * clampedProjection),
  ];
}

// Nearest Route Projection - finds the closest snapped segment point after the current progress index.
export function findNearestRouteProjection(
  coordinates: RouteCoordinate[],
  currentCoordinate: RouteCoordinate,
  minimumSegmentIndex = 0,
) {
  if (coordinates.length < 2) {
    return null;
  }

  let nearestProjection: RouteProjection | null = null;

  for (let index = minimumSegmentIndex; index < coordinates.length - 1; index += 1) {
    const projectedCoordinate = projectCoordinateOntoSegment(
      currentCoordinate,
      coordinates[index],
      coordinates[index + 1],
    );
    const distanceDegrees = getCoordinateDistance(projectedCoordinate, currentCoordinate);

    if (!nearestProjection || distanceDegrees < nearestProjection.distanceDegrees) {
      nearestProjection = {
        coordinate: projectedCoordinate,
        segmentIndex: index,
        distanceDegrees,
        distanceMeters: getCoordinateDistanceMeters(projectedCoordinate, currentCoordinate),
      };
    }
  }

  return nearestProjection;
}

// Route Slice From Projection - trims completed geometry and starts the route at the snapped live point.
export function sliceRouteFromProjection(
  coordinates: RouteCoordinate[],
  currentCoordinate: RouteCoordinate,
  minimumSegmentIndex = 0,
): SliceRouteFromProjectionResult {
  if (coordinates.length < 2) {
    return {
      remainingCoordinates: coordinates,
      progressSegmentIndex: null,
      snappedCoordinate: coordinates[0] ?? currentCoordinate,
    };
  }

  const nearestProjection = findNearestRouteProjection(
    coordinates,
    currentCoordinate,
    minimumSegmentIndex,
  );

  if (!nearestProjection) {
    return {
      remainingCoordinates: coordinates,
      progressSegmentIndex: null,
      snappedCoordinate: coordinates[0] ?? currentCoordinate,
    };
  }

  const remainingCoordinates = coordinates.slice(nearestProjection.segmentIndex + 1);
  const snappedCoordinate = nearestProjection.coordinate;

  if (remainingCoordinates.length === 0) {
    return {
      remainingCoordinates: [snappedCoordinate],
      progressSegmentIndex: nearestProjection.segmentIndex,
      snappedCoordinate,
    };
  }

  if (areCoordinatesEqual(snappedCoordinate, remainingCoordinates[0])) {
    return {
      remainingCoordinates,
      progressSegmentIndex: nearestProjection.segmentIndex,
      snappedCoordinate,
    };
  }

  return {
    remainingCoordinates: [snappedCoordinate, ...remainingCoordinates],
    progressSegmentIndex: nearestProjection.segmentIndex,
    snappedCoordinate,
  };
}

// Route Segment Merge - joins route coordinate arrays while avoiding duplicate seam points.
export function mergeRouteCoordinateSegments(...segments: RouteCoordinate[][]) {
  const mergedCoordinates: RouteCoordinate[] = [];

  segments.forEach((segment) => {
    segment.forEach((coordinate) => {
      if (
        mergedCoordinates.length === 0
        || !areCoordinatesEqual(mergedCoordinates[mergedCoordinates.length - 1], coordinate)
      ) {
        mergedCoordinates.push(coordinate);
      }
    });
  });

  return mergedCoordinates;
}

// Path Distance - totals meter distance across a polyline of route coordinates.
export function getPathDistanceMeters(coordinates: RouteCoordinate[]) {
  if (coordinates.length < 2) {
    return 0;
  }

  let totalDistanceMeters = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    totalDistanceMeters += getCoordinateDistanceMeters(
      coordinates[index],
      coordinates[index + 1],
    );
  }

  return totalDistanceMeters;
}

// Minimum Spacing Simplifier - removes overly dense intermediate points while preserving endpoints.
export function simplifyRouteCoordinatesByMinSpacing(
  coordinates: RouteCoordinate[],
  minimumSpacingMeters: number,
) {
  if (coordinates.length <= 2 || minimumSpacingMeters <= 0) {
    return [...coordinates];
  }

  const simplifiedCoordinates: RouteCoordinate[] = [coordinates[0]];

  for (let index = 1; index < coordinates.length - 1; index += 1) {
    if (
      getCoordinateDistanceMeters(
        simplifiedCoordinates[simplifiedCoordinates.length - 1],
        coordinates[index],
      ) >= minimumSpacingMeters
    ) {
      simplifiedCoordinates.push(coordinates[index]);
    }
  }

  const finalCoordinate = coordinates[coordinates.length - 1];

  if (!areCoordinatesEqual(simplifiedCoordinates[simplifiedCoordinates.length - 1], finalCoordinate)) {
    simplifiedCoordinates.push(finalCoordinate);
  }

  return simplifiedCoordinates;
}

// Adjacent Coordinate Deduper - removes consecutive points that are effectively duplicates.
export function dedupeAdjacentRouteCoordinates(
  coordinates: RouteCoordinate[],
  duplicateDistanceMeters = 0,
) {
  if (coordinates.length <= 1) {
    return {
      coordinates: [...coordinates],
      removedCount: 0,
    };
  }

  const dedupedCoordinates: RouteCoordinate[] = [coordinates[0]];
  let removedCount = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    if (
      getCoordinateDistanceMeters(
        dedupedCoordinates[dedupedCoordinates.length - 1],
        coordinates[index],
      ) <= duplicateDistanceMeters
    ) {
      removedCount += 1;
      continue;
    }

    dedupedCoordinates.push(coordinates[index]);
  }

  return {
    coordinates: dedupedCoordinates,
    removedCount,
  };
}

interface FindShortBranchRangesOptions {
  maxBranchLengthMeters?: number;
  maxRejoinDistanceMeters?: number;
  minimumBranchSpanSegments?: number;
}

// Branch Range Overlap - detects sanitizer ranges that would remove the same route span.
function doRouteBranchRangesOverlap(
  left: RouteBranchRange,
  right: RouteBranchRange,
) {
  return left.startIndex < right.endIndex && right.startIndex < left.endIndex;
}

// Branch Range Selector - keeps the best non-overlapping detour ranges for geometry cleanup.
function selectPreferredNonOverlappingBranchRanges(
  ranges: RouteBranchRange[],
) {
  const sortedRanges = [...ranges].sort(
    (left, right) => right.startIndex - left.startIndex
      || left.rejoinDistanceMeters - right.rejoinDistanceMeters
      || left.branchLengthMeters - right.branchLengthMeters
      || right.endIndex - left.endIndex,
  );
  const selectedRanges: RouteBranchRange[] = [];

  sortedRanges.forEach((range) => {
    if (
      selectedRanges.some((selectedRange) => doRouteBranchRangesOverlap(range, selectedRange))
    ) {
      return;
    }

    selectedRanges.push(range);
  });

  return selectedRanges.sort(
    (left, right) => left.startIndex - right.startIndex || left.endIndex - right.endIndex,
  );
}

// Short Branch Finder - detects small route detours that leave and quickly rejoin the corridor.
export function findShortBranchRanges(
  coordinates: RouteCoordinate[],
  {
    maxBranchLengthMeters = 450,
    maxRejoinDistanceMeters = 35,
    minimumBranchSpanSegments = 2,
  }: FindShortBranchRangesOptions = {},
) {
  const branchRangeCandidates: RouteBranchRange[] = [];

  if (coordinates.length < 4) {
    return branchRangeCandidates;
  }

  for (let startIndex = 0; startIndex < coordinates.length - minimumBranchSpanSegments; startIndex += 1) {
    let branchLengthMeters = 0;
    let preferredRangeForStartIndex: RouteBranchRange | null = null;

    for (let endIndex = startIndex + 1; endIndex < coordinates.length; endIndex += 1) {
      branchLengthMeters += getCoordinateDistanceMeters(
        coordinates[endIndex - 1],
        coordinates[endIndex],
      );

      if (branchLengthMeters > maxBranchLengthMeters) {
        break;
      }

      const spanSegments = endIndex - startIndex;

      if (spanSegments < minimumBranchSpanSegments) {
        continue;
      }

      const rejoinDistanceMeters = getCoordinateDistanceMeters(
        coordinates[startIndex],
        coordinates[endIndex],
      );

      if (rejoinDistanceMeters <= maxRejoinDistanceMeters) {
        const candidateRange = {
          startIndex,
          endIndex,
          branchLengthMeters,
          rejoinDistanceMeters,
        };

        if (
          !preferredRangeForStartIndex
          || candidateRange.rejoinDistanceMeters < preferredRangeForStartIndex.rejoinDistanceMeters
          || (
            candidateRange.rejoinDistanceMeters === preferredRangeForStartIndex.rejoinDistanceMeters
            && candidateRange.branchLengthMeters < preferredRangeForStartIndex.branchLengthMeters
          )
          || (
            candidateRange.rejoinDistanceMeters === preferredRangeForStartIndex.rejoinDistanceMeters
            && candidateRange.branchLengthMeters === preferredRangeForStartIndex.branchLengthMeters
            && candidateRange.endIndex > preferredRangeForStartIndex.endIndex
          )
        ) {
          preferredRangeForStartIndex = candidateRange;
        }
      }
    }

    if (preferredRangeForStartIndex) {
      branchRangeCandidates.push(preferredRangeForStartIndex);
    }
  }

  return selectPreferredNonOverlappingBranchRanges(branchRangeCandidates);
}

interface FindSelfReturningLoopRangesOptions {
  maxLoopLengthMeters?: number;
  maxRejoinDistanceMeters?: number;
  minimumLoopSpanSegments?: number;
}

// Self-Returning Loop Finder - detects looped geometry that returns to the same corridor point.
export function findSelfReturningLoopRanges(
  coordinates: RouteCoordinate[],
  {
    maxLoopLengthMeters = 2_500,
    maxRejoinDistanceMeters = 20,
    minimumLoopSpanSegments = 6,
  }: FindSelfReturningLoopRangesOptions = {},
) {
  const loopRanges: RouteBranchRange[] = [];

  if (coordinates.length < (minimumLoopSpanSegments + 2)) {
    return loopRanges;
  }

  for (let endIndex = minimumLoopSpanSegments; endIndex < coordinates.length; endIndex += 1) {
    for (let startIndex = endIndex - minimumLoopSpanSegments; startIndex >= 0; startIndex -= 1) {
      const rejoinDistanceMeters = getCoordinateDistanceMeters(
        coordinates[startIndex],
        coordinates[endIndex],
      );

      if (rejoinDistanceMeters > maxRejoinDistanceMeters) {
        continue;
      }

      const loopCoordinates = coordinates.slice(startIndex, endIndex + 1);
      const branchLengthMeters = getPathDistanceMeters(loopCoordinates);

      if (branchLengthMeters > maxLoopLengthMeters) {
        continue;
      }

      loopRanges.push({
        startIndex,
        endIndex,
        branchLengthMeters,
        rejoinDistanceMeters,
      });
      break;
    }
  }

  return loopRanges;
}

// Branch Range Remover - strips interior coordinates from detected detour or loop ranges.
function removeRouteBranchRanges(
  coordinates: RouteCoordinate[],
  branchRanges: RouteBranchRange[],
) {
  if (branchRanges.length === 0) {
    return [...coordinates];
  }

  const coordinatesToRemove = new Set<number>();

  branchRanges.forEach((range) => {
    for (let index = range.startIndex + 1; index < range.endIndex; index += 1) {
      coordinatesToRemove.add(index);
    }
  });

  return coordinates.filter((_, index) => !coordinatesToRemove.has(index));
}

// Stable Range Stripper - repeats branch removal until no additional cleanup ranges remain.
function stripRangesUntilStable(
  coordinates: RouteCoordinate[],
  findRanges: (coordinates: RouteCoordinate[]) => RouteBranchRange[],
) {
  let currentCoordinates = [...coordinates];
  const removedRanges: RouteBranchRange[] = [];

  while (currentCoordinates.length >= 2) {
    const ranges = findRanges(currentCoordinates);

    if (ranges.length === 0) {
      break;
    }

    removedRanges.push(...ranges);
    currentCoordinates = removeRouteBranchRanges(currentCoordinates, ranges);
  }

  return {
    coordinates: currentCoordinates,
    removedRanges,
  };
}

// Spacing Removal Counter - reports how many points were removed by minimum-spacing simplification.
function countRemovedSpacingCoordinates(
  originalCoordinates: RouteCoordinate[],
  simplifiedCoordinates: RouteCoordinate[],
) {
  return Math.max(0, originalCoordinates.length - simplifiedCoordinates.length);
}

// Official Geometry Sanitizer - dedupes, simplifies, and removes route artifacts while protecting endpoints.
export function sanitizeOfficialRouteGeometry(
  rawCoordinates: RouteCoordinate[],
  {
    adjacencyDuplicateDistanceMeters = 0.5,
    minimumSpacingMeters = 4,
    maxBranchLengthMeters = 450,
    maxRejoinDistanceMeters = 35,
    minimumBranchSpanSegments = 2,
    maxSelfReturningLoopLengthMeters = 2_500,
    maxSelfReturningLoopRejoinDistanceMeters = 20,
    minimumSelfReturningLoopSpanSegments = 6,
    maxEndpointDriftMeters = 20,
    minimumRetainedDistanceRatio = 0.65,
  }: RouteGeometrySanitizerOptions = {},
): SanitizedRouteGeometryResult {
  const rawDistanceMeters = getPathDistanceMeters(rawCoordinates);

  if (rawCoordinates.length < 2) {
    throw new Error('Cannot sanitize route geometry with fewer than two coordinates.');
  }

  const dedupedRoute = dedupeAdjacentRouteCoordinates(
    rawCoordinates,
    adjacencyDuplicateDistanceMeters,
  );
  const branchCleanup = stripRangesUntilStable(
    dedupedRoute.coordinates,
    (coordinates) => findShortBranchRanges(
      coordinates,
      {
        maxBranchLengthMeters,
        maxRejoinDistanceMeters,
        minimumBranchSpanSegments,
      },
    ),
  );
  const selfReturningLoopCleanup = stripRangesUntilStable(
    branchCleanup.coordinates,
    (coordinates) => findSelfReturningLoopRanges(
      coordinates,
      {
        maxLoopLengthMeters: maxSelfReturningLoopLengthMeters,
        maxRejoinDistanceMeters: maxSelfReturningLoopRejoinDistanceMeters,
        minimumLoopSpanSegments: minimumSelfReturningLoopSpanSegments,
      },
    ),
  );
  const simplifiedCoordinates = simplifyRouteCoordinatesByMinSpacing(
    selfReturningLoopCleanup.coordinates,
    minimumSpacingMeters,
  );
  const finalDedupedRoute = dedupeAdjacentRouteCoordinates(
    simplifiedCoordinates,
    adjacencyDuplicateDistanceMeters,
  );
  const finalBranchCleanup = stripRangesUntilStable(
    finalDedupedRoute.coordinates,
    (coordinates) => findShortBranchRanges(
      coordinates,
      {
        maxBranchLengthMeters,
        maxRejoinDistanceMeters,
        minimumBranchSpanSegments,
      },
    ),
  );
  const finalLoopCleanup = stripRangesUntilStable(
    finalBranchCleanup.coordinates,
    (coordinates) => findSelfReturningLoopRanges(
      coordinates,
      {
        maxLoopLengthMeters: maxSelfReturningLoopLengthMeters,
        maxRejoinDistanceMeters: maxSelfReturningLoopRejoinDistanceMeters,
        minimumLoopSpanSegments: minimumSelfReturningLoopSpanSegments,
      },
    ),
  );
  const finalCoordinates = dedupeAdjacentRouteCoordinates(
    finalLoopCleanup.coordinates,
    adjacencyDuplicateDistanceMeters,
  ).coordinates;
  const sanitizedDistanceMeters = getPathDistanceMeters(finalCoordinates);

  if (finalCoordinates.length < 2) {
    throw new Error('Sanitized route geometry became invalid after cleanup.');
  }

  if (
    getCoordinateDistanceMeters(rawCoordinates[0], finalCoordinates[0]) > maxEndpointDriftMeters
    || getCoordinateDistanceMeters(rawCoordinates[rawCoordinates.length - 1], finalCoordinates[finalCoordinates.length - 1]) > maxEndpointDriftMeters
  ) {
    throw new Error('Sanitized route geometry drifted too far from the original terminal corridor edges.');
  }

  if (
    rawDistanceMeters > 0
    && sanitizedDistanceMeters < (rawDistanceMeters * minimumRetainedDistanceRatio)
  ) {
    throw new Error('Sanitized route geometry removed too much corridor distance.');
  }

  return {
    coordinates: finalCoordinates,
    removedBranchRanges: [
      ...branchCleanup.removedRanges,
      ...finalBranchCleanup.removedRanges,
    ],
    removedSelfReturningLoopRanges: [
      ...selfReturningLoopCleanup.removedRanges,
      ...finalLoopCleanup.removedRanges,
    ],
    removedAdjacentDuplicates: dedupedRoute.removedCount + finalDedupedRoute.removedCount,
    removedSpacingCoordinates: countRemovedSpacingCoordinates(selfReturningLoopCleanup.coordinates, simplifiedCoordinates),
    rawCoordinateCount: rawCoordinates.length,
    sanitizedCoordinateCount: finalCoordinates.length,
    rawDistanceMeters,
    sanitizedDistanceMeters,
  };
}
