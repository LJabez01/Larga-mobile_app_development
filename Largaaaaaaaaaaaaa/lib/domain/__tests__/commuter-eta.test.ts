import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyCommuterEtaState,
  resolveStopAwareEta,
} from '@/lib/domain/commuter-eta';

test('resolveStopAwareEta uses a rolling average while the vehicle keeps moving', () => {
  const firstUpdate = resolveStopAwareEta({
    distanceMeters: 3000,
    speedKph: 20,
    recordedAt: '2026-06-12T08:00:00.000Z',
  });
  const secondUpdate = resolveStopAwareEta({
    distanceMeters: 2000,
    speedKph: 10,
    recordedAt: '2026-06-12T08:00:20.000Z',
    previousState: firstUpdate.state,
  });

  assert.equal(firstUpdate.etaMinutes, 9);
  assert.equal(secondUpdate.mode, 'rolling_average');
  assert.equal(secondUpdate.effectiveSpeedKph, 15);
  assert.equal(secondUpdate.etaMinutes, 8);
});

test('resolveStopAwareEta holds the previous ETA when the vehicle stops', () => {
  const movingUpdate = resolveStopAwareEta({
    distanceMeters: 2400,
    speedKph: 18,
    recordedAt: '2026-06-12T08:00:00.000Z',
  });
  const stoppedUpdate = resolveStopAwareEta({
    distanceMeters: 2400,
    speedKph: 0,
    recordedAt: '2026-06-12T08:00:10.000Z',
    previousState: movingUpdate.state,
  });

  assert.equal(movingUpdate.etaMinutes, 8);
  assert.equal(stoppedUpdate.mode, 'held');
  assert.equal(stoppedUpdate.etaMinutes, movingUpdate.etaMinutes);
});

test('resolveStopAwareEta uses recent movement when live speed is temporarily missing', () => {
  const movingUpdate = resolveStopAwareEta({
    distanceMeters: 2700,
    speedKph: 18,
    recordedAt: '2026-06-12T08:00:00.000Z',
  });
  const missingSpeedUpdate = resolveStopAwareEta({
    distanceMeters: 1800,
    speedKph: null,
    recordedAt: '2026-06-12T08:00:12.000Z',
    previousState: movingUpdate.state,
  });

  assert.equal(missingSpeedUpdate.mode, 'rolling_average');
  assert.equal(missingSpeedUpdate.effectiveSpeedKph, 18);
  assert.equal(missingSpeedUpdate.etaMinutes, 6);
});

test('resolveStopAwareEta stays unavailable when there is no reliable movement history yet', () => {
  const etaUpdate = resolveStopAwareEta({
    distanceMeters: 1800,
    speedKph: 0,
    recordedAt: '2026-06-12T08:00:00.000Z',
    previousState: createEmptyCommuterEtaState(),
  });

  assert.equal(etaUpdate.mode, 'unavailable');
  assert.equal(etaUpdate.etaMinutes, null);
});
