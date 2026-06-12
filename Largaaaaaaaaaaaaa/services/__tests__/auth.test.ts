import test from 'node:test';
import assert from 'node:assert/strict';

import { getAuthErrorMessage } from '@/services/auth';

test('getAuthErrorMessage maps common Firebase auth codes', () => {
  assert.equal(
    getAuthErrorMessage({ code: 'auth/email-already-in-use' }),
    'This email is already in use.'
  );
  assert.equal(
    getAuthErrorMessage({ code: 'auth/invalid-credential' }),
    'Your email or password is incorrect.'
  );
  assert.equal(
    getAuthErrorMessage({ code: 'auth/network-request-failed' }),
    'Check your internet connection and try again.'
  );
});

test('getAuthErrorMessage falls back for unknown errors', () => {
  assert.equal(getAuthErrorMessage({ code: 'auth/something-else' }), 'Please try again.');
  assert.equal(getAuthErrorMessage(new Error('boom')), 'Please try again.');
});
