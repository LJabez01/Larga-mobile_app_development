import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFallbackDisplayName,
  buildUserDocument,
  resolveDisplayName,
  shouldSyncDisplayName,
  syncUserDisplayName,
} from '@/services/users';

test('buildFallbackDisplayName humanizes the email local part', () => {
  assert.equal(buildFallbackDisplayName('carl_lester@example.com'), 'Carl Lester');
  assert.equal(buildFallbackDisplayName('jeep-driver@example.com'), 'Jeep Driver');
});

test('resolveDisplayName prefers provided names before email fallback', () => {
  assert.equal(
    resolveDisplayName({ email: 'commuter@example.com', displayName: null }, '  Carl Lester  '),
    'Carl Lester'
  );
  assert.equal(
    resolveDisplayName({ email: 'commuter@example.com', displayName: 'Firebase Name' }),
    'Firebase Name'
  );
  assert.equal(
    resolveDisplayName({ email: 'commuter_user@example.com', displayName: null }),
    'Commuter User'
  );
});

test('buildUserDocument creates a commuter profile by default', () => {
  const profile = buildUserDocument({
    uid: 'user-1',
    email: 'commuter@example.com',
    displayName: 'Commuter User',
    now: '2026-05-10T01:00:00.000Z',
  });

  assert.deepEqual(profile, {
    uid: 'user-1',
    role: 'commuter',
    email: 'commuter@example.com',
    displayName: 'Commuter User',
    phoneNumber: null,
    createdAt: '2026-05-10T01:00:00.000Z',
    updatedAt: '2026-05-10T01:00:00.000Z',
  });
});

test('shouldSyncDisplayName detects when an existing profile needs a preferred name update', () => {
  const profile = buildUserDocument({
    uid: 'user-1',
    email: 'commuter@example.com',
    displayName: 'Commuter User',
    now: '2026-05-10T01:00:00.000Z',
  });

  assert.equal(shouldSyncDisplayName(profile, 'Carl Lester'), true);
  assert.equal(shouldSyncDisplayName(profile, 'Commuter User'), false);
  assert.equal(shouldSyncDisplayName(profile, '   '), false);
});

test('syncUserDisplayName preserves createdAt and only updates the mutable fields', () => {
  const profile = buildUserDocument({
    uid: 'user-1',
    email: 'commuter@example.com',
    displayName: 'Commuter User',
    now: '2026-05-10T01:00:00.000Z',
  });

  assert.deepEqual(
    syncUserDisplayName(profile, 'Carl Lester', '2026-05-10T02:00:00.000Z'),
    {
      ...profile,
      displayName: 'Carl Lester',
      updatedAt: '2026-05-10T02:00:00.000Z',
    }
  );
});
