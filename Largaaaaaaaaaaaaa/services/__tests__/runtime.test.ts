import test from 'node:test';
import assert from 'node:assert/strict';

import { getAppMode, isMockMode } from '@/services/runtime/app-mode';

const ORIGINAL_APP_MODE = process.env.EXPO_PUBLIC_APP_MODE;

test('getAppMode defaults to firebase when unset', () => {
  delete process.env.EXPO_PUBLIC_APP_MODE;

  assert.equal(getAppMode(), 'firebase');
  assert.equal(isMockMode(), false);
});

test('getAppMode accepts mock mode explicitly', () => {
  process.env.EXPO_PUBLIC_APP_MODE = 'mock';

  assert.equal(getAppMode(), 'mock');
  assert.equal(isMockMode(), true);
});

test.after(() => {
  if (typeof ORIGINAL_APP_MODE === 'string') {
    process.env.EXPO_PUBLIC_APP_MODE = ORIGINAL_APP_MODE;
  } else {
    delete process.env.EXPO_PUBLIC_APP_MODE;
  }
});
