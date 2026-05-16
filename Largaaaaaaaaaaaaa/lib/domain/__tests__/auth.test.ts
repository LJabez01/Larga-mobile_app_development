import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAppRole,
  isSelfServiceRole,
  normalizeRole,
} from '@/lib/domain/auth';

test('normalizeRole converts UI role labels to backend-safe lowercase values', () => {
  assert.equal(normalizeRole('Commuter'), 'commuter');
  assert.equal(normalizeRole('Driver'), 'driver');
});

test('public registration only allows commuter as a self-service role', () => {
  assert.equal(isSelfServiceRole('commuter'), true);
  assert.equal(isSelfServiceRole('driver'), false);
  assert.equal(isSelfServiceRole('admin'), false);
});

test('isAppRole rejects non-supported roles', () => {
  assert.equal(isAppRole('commuter'), true);
  assert.equal(isAppRole('manager'), false);
});
