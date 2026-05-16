import test from 'node:test';
import assert from 'node:assert/strict';

import { mockAuthService } from '@/services/auth/mock-auth';

test('mock sign in defaults to commuter when email is not driver-like', async () => {
  await mockAuthService.reset();
  const snapshot = await mockAuthService.signIn({
    email: 'person@example.com',
    password: 'Password123!',
  });

  assert.equal(snapshot.status, 'signedIn');
  assert.equal(snapshot.session?.role, 'commuter');
});

test('mock sign in infers driver from email and logout clears session', async () => {
  await mockAuthService.reset();
  const signInSnapshot = await mockAuthService.signIn({
    email: 'driver@example.com',
    password: 'Password123!',
  });

  assert.equal(signInSnapshot.session?.role, 'driver');

  const signOutSnapshot = await mockAuthService.signOut();

  assert.equal(signOutSnapshot.status, 'signedOut');
  assert.equal(signOutSnapshot.session, null);
});
