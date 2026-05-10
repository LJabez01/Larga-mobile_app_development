import test from 'node:test';
import assert from 'node:assert/strict';

import { getAuthErrorMessage } from '@/services/auth';

test('getAuthErrorMessage maps common Firebase auth codes', () => {
  assert.equal(
    getAuthErrorMessage({ code: 'auth/email-already-in-use' }),
    'That email is already in use.'
  );
  assert.equal(
    getAuthErrorMessage({ code: 'auth/invalid-credential' }),
    'Email or password is incorrect.'
  );
  assert.equal(
    getAuthErrorMessage({ code: 'auth/network-request-failed' }),
    'Network error. Check your connection and try again.'
  );
});

test('getAuthErrorMessage falls back for unknown errors', () => {
  assert.equal(getAuthErrorMessage({ code: 'auth/something-else' }), 'Something went wrong. Please try again.');
  assert.equal(getAuthErrorMessage(new Error('boom')), 'Something went wrong. Please try again.');
});
