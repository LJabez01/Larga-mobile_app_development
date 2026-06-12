import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthSnapshotStore } from '@/services/auth/auth-snapshot-store';
import type { AuthSnapshot } from '@/services/contracts/auth';

const signedOutSnapshot: AuthSnapshot = {
  status: 'signedOut',
  session: null,
};

const signedInSnapshot: AuthSnapshot = {
  status: 'signedIn',
  session: {
    userId: 'driver-1',
    role: 'driver',
    displayName: 'Test Driver',
    email: 'driver@example.com',
    approvedRoles: ['driver'],
    pendingRoles: [],
    primaryRole: 'driver',
    availableRoleChoices: ['driver'],
    defaultPostLoginRoute: '/driver',
    needsRoleSelection: false,
    hasPendingAccessOnly: false,
  },
};

test('auth snapshot store does not report signed out before initial hydration finishes', async () => {
  const store = createAuthSnapshotStore();
  const receivedSnapshots: AuthSnapshot[] = [];
  let initialSnapshotResolved = false;

  store.subscribe((snapshot) => receivedSnapshots.push(snapshot));
  const initialSnapshotPromise = store.getInitialSnapshot().then((snapshot) => {
    initialSnapshotResolved = true;
    return snapshot;
  });

  await Promise.resolve();

  assert.equal(initialSnapshotResolved, false);
  assert.deepEqual(receivedSnapshots, []);

  store.publish(signedOutSnapshot);

  assert.deepEqual(await initialSnapshotPromise, signedOutSnapshot);
  assert.deepEqual(receivedSnapshots, [signedOutSnapshot]);
});

test('auth snapshot store replays the latest authoritative snapshot to later subscribers', () => {
  const store = createAuthSnapshotStore();
  const receivedSnapshots: AuthSnapshot[] = [];

  store.publish(signedOutSnapshot);
  store.subscribe((snapshot) => receivedSnapshots.push(snapshot));

  assert.deepEqual(receivedSnapshots, [signedOutSnapshot]);
});

test('auth snapshot store returns the latest snapshot after auth state changes', async () => {
  const store = createAuthSnapshotStore();

  store.publish(signedOutSnapshot);
  store.publish(signedInSnapshot);

  assert.deepEqual(await store.getInitialSnapshot(), signedInSnapshot);
});
