import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dedupeAdjacentRouteCoordinates,
  findNearestRouteProjection,
  findSelfReturningLoopRanges,
  findShortBranchRanges,
  getBearingDeltaDegrees,
  getCoordinateDistanceMeters,
  getPathDistanceMeters,
  sanitizeOfficialRouteGeometry,
  getSegmentBearingDegrees,
  mergeRouteCoordinateSegments,
  simplifyRouteCoordinatesByMinSpacing,
  sliceRouteFromProjection,
} from '@/lib/domain/route-geometry';

test('sliceRouteFromProjection preserves a continuous remaining corridor from the snapped projection', () => {
  const result = sliceRouteFromProjection(
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.020000, 14.000000],
    ],
    [120.015000, 14.002000],
  );

  assert.deepEqual(result.snappedCoordinate, [120.015000, 14.000000]);
  assert.equal(result.progressSegmentIndex, 1);
  assert.deepEqual(result.remainingCoordinates, [
    [120.015000, 14.000000],
    [120.020000, 14.000000],
  ]);
});

test('sliceRouteFromProjection can enforce forward-only slicing from a minimum segment index', () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.000000, 14.001000],
    [120.000000, 14.002000],
    [120.000000, 14.003000],
    [120.001000, 14.003000],
    [120.002000, 14.003000],
    [120.002000, 14.002000],
    [120.002000, 14.001000],
    [120.002000, 14.000000],
  ] as [number, number][];

  const unrestricted = sliceRouteFromProjection(routeCoordinates, [120.000200, 14.001100]);
  const forwardOnly = sliceRouteFromProjection(routeCoordinates, [120.000200, 14.001100], 4);

  assert.ok(unrestricted.progressSegmentIndex !== null);
  assert.ok(forwardOnly.progressSegmentIndex !== null);
  assert.ok(unrestricted.progressSegmentIndex! < 4);
  assert.ok(forwardOnly.progressSegmentIndex! >= 4);
  assert.notDeepEqual(unrestricted.remainingCoordinates[0], forwardOnly.remainingCoordinates[0]);
});

test('findNearestRouteProjection reports the projected coordinate and metric distance', () => {
  const projection = findNearestRouteProjection(
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
    ],
    [120.005000, 14.001000],
  );

  assert.ok(projection);
  assert.deepEqual(projection.coordinate, [120.005000, 14.000000]);
  assert.equal(projection.segmentIndex, 0);
  assert.ok(projection.distanceMeters > 100);
});

test('findShortBranchRanges detects short loop-like noise that rejoins the corridor', () => {
  const branchRanges = findShortBranchRanges([
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.001400, 14.000300],
    [120.001100, 14.000600],
    [120.001000, 14.000050],
    [120.002000, 14.000000],
  ]);

  assert.equal(branchRanges.length, 1);
  assert.equal(branchRanges[0].startIndex, 1);
  assert.equal(branchRanges[0].endIndex, 4);
  assert.ok(branchRanges[0].branchLengthMeters > branchRanges[0].rejoinDistanceMeters);
});

test('findShortBranchRanges ignores long corridor progress that should stay in the official spine', () => {
  const branchRanges = findShortBranchRanges([
    [120.000000, 14.000000],
    [120.005000, 14.000000],
    [120.010000, 14.000000],
    [120.015000, 14.000000],
  ]);

  assert.deepEqual(branchRanges, []);
});

test('findSelfReturningLoopRanges detects a longer out-and-back loop that returns to the same corridor point', () => {
  const loopRanges = findSelfReturningLoopRanges([
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.001500, 14.000800],
    [120.001800, 14.001300],
    [120.001300, 14.001600],
    [120.000800, 14.001000],
    [120.001000, 14.000010],
    [120.002000, 14.000000],
  ], {
    maxLoopLengthMeters: 800,
    maxRejoinDistanceMeters: 20,
    minimumLoopSpanSegments: 4,
  });

  assert.equal(loopRanges.length, 1);
  assert.equal(loopRanges[0].startIndex, 1);
  assert.equal(loopRanges[0].endIndex, 6);
  assert.ok(loopRanges[0].branchLengthMeters > 300);
});

test('simplifyRouteCoordinatesByMinSpacing preserves endpoints while removing dense intermediate noise', () => {
  const simplified = simplifyRouteCoordinatesByMinSpacing([
    [120.000000, 14.000000],
    [120.000050, 14.000000],
    [120.000100, 14.000000],
    [120.001000, 14.000000],
  ], 20);

  assert.deepEqual(simplified[0], [120.000000, 14.000000]);
  assert.deepEqual(simplified[simplified.length - 1], [120.001000, 14.000000]);
  assert.equal(simplified.length, 2);
});

test('dedupeAdjacentRouteCoordinates removes repeated neighboring coordinates without moving the corridor endpoints', () => {
  const deduped = dedupeAdjacentRouteCoordinates([
    [120.000000, 14.000000],
    [120.000000, 14.000000],
    [120.000050, 14.000000],
    [120.001000, 14.000000],
  ], 1);

  assert.deepEqual(deduped.coordinates, [
    [120.000000, 14.000000],
    [120.000050, 14.000000],
    [120.001000, 14.000000],
  ]);
  assert.equal(deduped.removedCount, 1);
});

test('sanitizeOfficialRouteGeometry removes a short rejoining branch and preserves one continuous corridor', () => {
  const sanitized = sanitizeOfficialRouteGeometry([
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.001400, 14.000300],
    [120.001100, 14.000600],
    [120.001000, 14.000050],
    [120.002000, 14.000000],
    [120.003000, 14.000000],
  ], {
    minimumSpacingMeters: 0,
  });

  assert.equal(sanitized.removedBranchRanges.length, 1);
  assert.deepEqual(sanitized.coordinates, [
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.001000, 14.000050],
    [120.002000, 14.000000],
    [120.003000, 14.000000],
  ]);
  assert.deepEqual(sanitized.coordinates[0], [120.000000, 14.000000]);
  assert.deepEqual(sanitized.coordinates[sanitized.coordinates.length - 1], [120.003000, 14.000000]);
  assert.ok(sanitized.sanitizedDistanceMeters <= sanitized.rawDistanceMeters);
});

test('sanitizeOfficialRouteGeometry removes self-returning loops before rendering the official corridor spine', () => {
  const sanitized = sanitizeOfficialRouteGeometry([
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.001500, 14.000800],
    [120.001800, 14.001300],
    [120.001300, 14.001600],
    [120.000800, 14.001000],
    [120.001000, 14.000010],
    [120.002000, 14.000000],
    [120.003000, 14.000000],
  ], {
    minimumSpacingMeters: 0,
    maxBranchLengthMeters: 200,
    maxSelfReturningLoopLengthMeters: 800,
    maxSelfReturningLoopRejoinDistanceMeters: 20,
    minimumSelfReturningLoopSpanSegments: 4,
    minimumRetainedDistanceRatio: 0.35,
  });

  assert.equal(sanitized.removedSelfReturningLoopRanges.length, 1);
  assert.deepEqual(sanitized.coordinates, [
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.001000, 14.000010],
    [120.002000, 14.000000],
    [120.003000, 14.000000],
  ]);
});

test('sanitizeOfficialRouteGeometry removes a terminal-end out-and-back spur without clipping the main corridor', () => {
  const sanitized = sanitizeOfficialRouteGeometry([
    [120.000000, 14.000000],
    [120.000400, 14.000000],
    [120.000800, 14.000000],
    [120.001200, 14.000000],
    [120.001450, 14.000080],
    [120.001620, 14.000200],
    [120.001450, 14.000080],
  ], {
    minimumSpacingMeters: 0,
    maxRejoinDistanceMeters: 25,
    minimumRetainedDistanceRatio: 0.4,
  });

  assert.deepEqual(sanitized.coordinates, [
    [120.000000, 14.000000],
    [120.000400, 14.000000],
    [120.000800, 14.000000],
    [120.001200, 14.000000],
    [120.001450, 14.000080],
  ]);
  assert.equal(sanitized.removedBranchRanges.length, 1);
  assert.deepEqual(findShortBranchRanges(sanitized.coordinates), []);
});

test('sanitizeOfficialRouteGeometry fails loudly when cleanup would over-trim the official corridor', () => {
  assert.throws(
    () => sanitizeOfficialRouteGeometry([
      [120.000000, 14.000000],
      [120.001000, 14.000000],
      [120.002000, 14.000000],
      [120.003000, 14.000000],
    ], {
      minimumSpacingMeters: 0,
      minimumRetainedDistanceRatio: 1.01,
    }),
    /removed too much corridor distance/i,
  );
});

test('mergeRouteCoordinateSegments removes duplicate joins across adjacent corridor pieces', () => {
  const merged = mergeRouteCoordinateSegments(
    [
      [120.000000, 14.000000],
      [120.001000, 14.000000],
    ],
    [
      [120.001000, 14.000000],
      [120.002000, 14.000000],
    ],
  );

  assert.deepEqual(merged, [
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.002000, 14.000000],
  ]);
});

test('bearing helpers keep turn detection stable for corridor anchoring', () => {
  const incomingBearing = getSegmentBearingDegrees(
    [120.000000, 14.000000],
    [120.001000, 14.000000],
  );
  const outgoingBearing = getSegmentBearingDegrees(
    [120.001000, 14.000000],
    [120.001000, 14.001000],
  );

  assert.ok(incomingBearing !== null);
  assert.ok(outgoingBearing !== null);
  assert.ok(Math.abs(incomingBearing - 90) < 0.001);
  assert.ok(Math.abs(outgoingBearing - 0) < 0.001);
  assert.ok(Math.abs(getBearingDeltaDegrees(incomingBearing, outgoingBearing) - 90) < 0.001);
});

test('distance helpers keep corridor metrics continuous', () => {
  const firstLegMeters = getCoordinateDistanceMeters(
    [120.000000, 14.000000],
    [120.005000, 14.000000],
  );
  const fullPathMeters = getPathDistanceMeters([
    [120.000000, 14.000000],
    [120.005000, 14.000000],
    [120.010000, 14.000000],
  ]);

  assert.ok(firstLegMeters > 500);
  assert.ok(fullPathMeters > firstLegMeters);
});
