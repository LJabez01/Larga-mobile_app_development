import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDirectionKey,
  buildRouteId,
  isVehicleTypeSupported,
} from '@/lib/domain/routes';

test('buildDirectionKey is stable for origin and destination terminal ids', () => {
  assert.equal(
    buildDirectionKey('santa-maria-bayan', 'halang-terminal'),
    'santa-maria-bayan__halang-terminal'
  );
});

test('buildRouteId encodes vehicle type and direction', () => {
  assert.equal(
    buildRouteId('jeepney', 'santa-maria-bayan', 'halang-terminal'),
    'jeepney__santa-maria-bayan__halang-terminal'
  );
});

test('supported vehicle types are limited to jeepney and bus', () => {
  assert.equal(isVehicleTypeSupported('jeepney'), true);
  assert.equal(isVehicleTypeSupported('bus'), true);
  assert.equal(isVehicleTypeSupported('tricycle'), false);
});
