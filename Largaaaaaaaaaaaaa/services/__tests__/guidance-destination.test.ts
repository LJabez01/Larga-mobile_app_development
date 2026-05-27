import assert from 'node:assert/strict';
import test from 'node:test';

import type { RouteRecord, TerminalOption } from '@/lib/domain/transport';
import { getDestinationRouteCoordinate } from '@/services/live-data/guidance-destination';

test('getDestinationRouteCoordinate prefers the route tail over the terminal marker coordinate', () => {
  const route: RouteRecord = {
    id: 'san-jose-sta-maria-bayan',
    label: 'San Jose - Sta. Maria Bayan',
    originTerminalId: 'san-jose-terminal',
    destinationTerminalId: 'sta-maria-bayan',
    vehicleType: 'jeep',
    isActive: true,
    coordinates: [
      [121.055054, 14.854016],
      [121.054586, 14.853610],
    ],
  };
  const terminals: TerminalOption[] = [{
    id: 'sta-maria-bayan',
    label: 'Sta. Maria Bayan Terminal',
    coordinate: [120.958856, 14.817831],
    isActive: true,
  }];

  assert.deepEqual(
    getDestinationRouteCoordinate(route, terminals),
    [121.054586, 14.853610],
  );
});

test('getDestinationRouteCoordinate falls back to the terminal marker when the route is missing coordinates', () => {
  const route: RouteRecord = {
    id: 'broken-route',
    label: 'Broken',
    originTerminalId: 'san-jose-terminal',
    destinationTerminalId: 'sta-maria-bayan',
    vehicleType: 'jeep',
    isActive: true,
    coordinates: [],
  };
  const terminals: TerminalOption[] = [{
    id: 'sta-maria-bayan',
    label: 'Sta. Maria Bayan Terminal',
    coordinate: [120.958856, 14.817831],
    isActive: true,
  }];

  assert.deepEqual(
    getDestinationRouteCoordinate(route, terminals),
    [120.958856, 14.817831],
  );
});
