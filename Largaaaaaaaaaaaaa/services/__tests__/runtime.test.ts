import test from 'node:test';
import assert from 'node:assert/strict';

import { getAppMode, isMockMode, resolveAppMode } from '@/services/runtime/app-mode';

type TestGlobal = typeof globalThis & { __DEV__?: boolean };

const testGlobal = globalThis as TestGlobal;
const ORIGINAL_APP_MODE = process.env.EXPO_PUBLIC_APP_MODE;
const ORIGINAL_DEV_FLAG = testGlobal.__DEV__;

test('getAppMode defaults to firebase when unset', () => {
  delete process.env.EXPO_PUBLIC_APP_MODE;
  testGlobal.__DEV__ = false;

  assert.equal(getAppMode(), 'firebase');
  assert.equal(isMockMode(), false);
});

test('getAppMode defaults to mock in development builds when unset', () => {
  delete process.env.EXPO_PUBLIC_APP_MODE;
  testGlobal.__DEV__ = true;

  assert.equal(getAppMode(), 'mock');
  assert.equal(isMockMode(), true);
});

test('getAppMode accepts mock mode explicitly', () => {
  process.env.EXPO_PUBLIC_APP_MODE = 'mock';
  testGlobal.__DEV__ = false;

  assert.equal(getAppMode(), 'mock');
  assert.equal(isMockMode(), true);
});

test('resolveAppMode falls back to the build default when the override is invalid', () => {
  assert.equal(resolveAppMode('unexpected-mode', true), 'mock');
  assert.equal(resolveAppMode('unexpected-mode', false), 'firebase');
});

test.after(() => {
  if (typeof ORIGINAL_APP_MODE === 'string') {
    process.env.EXPO_PUBLIC_APP_MODE = ORIGINAL_APP_MODE;
  } else {
    delete process.env.EXPO_PUBLIC_APP_MODE;
  }

  testGlobal.__DEV__ = ORIGINAL_DEV_FLAG;
});
