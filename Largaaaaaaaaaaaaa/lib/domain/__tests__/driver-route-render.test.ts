import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDriverRouteRenderModel } from '@/lib/domain/driver-route-render';
import type { DriverGuidanceState, RouteCoordinate } from '@/lib/domain/transport';

// Guidance State Fixture - creates a default driver guidance state with targeted overrides.
function createGuidanceState(overrides: Partial<DriverGuidanceState> = {}): DriverGuidanceState {
  return {
    mode: 'live-guidance',
    sourceRouteId: 'route-1',
    sourceRouteGeometrySignature: null,
    originCoordinate: [120.000000, 14.000000],
    destinationCoordinate: [120.010000, 14.010000],
    routeProgressSegmentIndex: 4,
    routeCoordinates: [
      [120.002000, 14.002000],
      [120.004000, 14.004000],
      [120.010000, 14.010000],
    ],
    connectorCoordinates: [
      [120.001000, 14.001000],
      [120.002000, 14.002000],
    ],
    warningMessage: null,
    updatedAt: '2026-05-25T00:00:00.000Z',
    ...overrides,
  };
}

test('buildDriverRouteRenderModel returns only the remaining corridor and reconnect path for active guidance', () => {
  const vehicleCoordinate = [120.001000, 14.001000] as RouteCoordinate;
  const destinationCoordinate = [120.010000, 14.010000] as RouteCoordinate;
  const guidance = createGuidanceState();

  const renderModel = buildDriverRouteRenderModel({
    activeRouteId: 'route-1',
    guidance,
    vehicleCoordinate,
    destinationCoordinate,
  });

  assert.equal(renderModel.routeId, 'route-1');
  assert.equal(renderModel.guidanceMode, 'live-guidance');
  assert.deepEqual(renderModel.mainRouteCoordinates, guidance.routeCoordinates);
  assert.deepEqual(renderModel.reconnectCoordinates, guidance.connectorCoordinates);
  assert.deepEqual(renderModel.boundsCoordinates, [
    ...guidance.routeCoordinates!,
    ...guidance.connectorCoordinates!,
    vehicleCoordinate,
    destinationCoordinate,
  ]);
});

test('buildDriverRouteRenderModel does not emit a reconnect line when only the remaining corridor should render', () => {
  const guidance = createGuidanceState({
    mode: 'stored-route-fallback',
    connectorCoordinates: null,
  });

  const renderModel = buildDriverRouteRenderModel({
    activeRouteId: 'route-1',
    guidance,
    vehicleCoordinate: [120.001000, 14.001000],
    destinationCoordinate: [120.010000, 14.010000],
  });

  assert.equal(renderModel.guidanceMode, 'stored-route-fallback');
  assert.deepEqual(renderModel.mainRouteCoordinates, guidance.routeCoordinates);
  assert.equal(renderModel.reconnectCoordinates, null);
});

test('buildDriverRouteRenderModel ignores too-short route fragments so the map does not draw junk stubs', () => {
  const guidance = createGuidanceState({
    routeCoordinates: [[120.010000, 14.010000]],
    connectorCoordinates: [[120.001000, 14.001000]],
  });
  const vehicleCoordinate = [120.001000, 14.001000] as RouteCoordinate;
  const destinationCoordinate = [120.010000, 14.010000] as RouteCoordinate;

  const renderModel = buildDriverRouteRenderModel({
    activeRouteId: 'route-1',
    guidance,
    vehicleCoordinate,
    destinationCoordinate,
  });

  assert.equal(renderModel.mainRouteCoordinates, null);
  assert.equal(renderModel.reconnectCoordinates, null);
  assert.deepEqual(renderModel.boundsCoordinates, [
    vehicleCoordinate,
    destinationCoordinate,
  ]);
});
