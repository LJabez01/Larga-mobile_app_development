import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAppRole,
  normalizeApprovedRoles,
  normalizePendingRoles,
  resolveDefaultPostLoginRoute,
  isSelfServiceRole,
  normalizeRole,
} from '@/lib/domain/auth';

test('normalizeRole converts UI role labels to backend-safe lowercase values', () => {
  assert.equal(normalizeRole('Commuter'), 'commuter');
  assert.equal(normalizeRole('Driver'), 'driver');
});

test('public registration only allows commuter as a self-service role', () => {
  assert.equal(isSelfServiceRole('commuter'), true);
  assert.equal(isSelfServiceRole('driver'), true);
  assert.equal(isSelfServiceRole('admin'), false);
});

test('isAppRole rejects non-supported roles', () => {
  assert.equal(isAppRole('commuter'), true);
  assert.equal(isAppRole('manager'), false);
});

test('role normalization keeps only supported approved and pending roles', () => {
  assert.deepEqual(normalizeApprovedRoles(['commuter', 'driver', 'driver', 'manager']), ['commuter', 'driver']);
  assert.deepEqual(normalizePendingRoles(['driver', 'driver', 'admin']), ['driver']);
});

test('default routing sends pending-driver-only users to pending access', () => {
  assert.equal(resolveDefaultPostLoginRoute([], ['driver'], null), '/pending-access');
  assert.equal(resolveDefaultPostLoginRoute(['commuter'], ['driver'], 'commuter'), '/commuter');
  assert.equal(resolveDefaultPostLoginRoute(['admin'], [], 'admin'), '/admin');
});
