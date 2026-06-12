import test from 'node:test';
import assert from 'node:assert/strict';

import { getRouteFareStopOptions } from '@/lib/domain/commuter-fare';

test('returns ordered fare stop options with labels for a fare-enabled route', () => {
  const options = getRouteFareStopOptions('sta-maria-bayan-norzagaray');

  assert.deepEqual(
    options.map((option) => ({
      locationId: option.locationId,
      label: option.label,
      orderIndex: option.orderIndex,
    })),
    [
      {
        locationId: 'sta-maria-bayan',
        label: 'Sta. Maria Bayan Terminal',
        orderIndex: 0,
      },
      {
        locationId: 'waltermart-sta-maria-sta-clara-route-point',
        label: 'WalterMart Sta. Maria / Sta. Clara Route Point',
        orderIndex: 1,
      },
      {
        locationId: 'amber-homes-route-point',
        label: 'Amber Homes Road Access Point',
        orderIndex: 2,
      },
      {
        locationId: 'norzagaray-terminal',
        label: 'Norzagaray Terminal',
        orderIndex: 3,
      },
    ],
  );
});

test('returns an empty list for non-fare-enabled routes or missing route context', () => {
  assert.deepEqual(getRouteFareStopOptions(null), []);
  assert.deepEqual(getRouteFareStopOptions('unknown-route'), []);
});
