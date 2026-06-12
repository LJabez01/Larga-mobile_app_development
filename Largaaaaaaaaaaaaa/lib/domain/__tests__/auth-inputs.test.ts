import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_USERNAME_LENGTH,
  normalizePasswordInput,
  normalizeUsernameInput,
  sanitizeUsernameDraft,
} from '@/lib/domain/auth-inputs';

test('normalizePasswordInput removes all whitespace from passwords', () => {
  assert.equal(normalizePasswordInput('Lesterdriver123! '), 'Lesterdriver123!');
  assert.equal(normalizePasswordInput(' Lester driver123!\n'), 'Lesterdriver123!');
});

test('sanitizeUsernameDraft strips leading whitespace, collapses repeated spaces, and caps length', () => {
  assert.equal(sanitizeUsernameDraft('     Carl   Lester'), 'Carl Lester');
  assert.equal(
    sanitizeUsernameDraft('abcdefghijklmnopqrstuvw'),
    'abcdefghijklmnopqrst'.slice(0, MAX_USERNAME_LENGTH),
  );
});

test('normalizeUsernameInput trims the final username value', () => {
  assert.equal(normalizeUsernameInput('  Carl Lester  '), 'Carl Lester');
  assert.equal(normalizeUsernameInput('          '), '');
  assert.equal(normalizeUsernameInput('Carl Lester The Driver'), 'Carl Lester The Driver');
});
