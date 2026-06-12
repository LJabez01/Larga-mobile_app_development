import test from 'node:test';
import assert from 'node:assert/strict';

import { validateLoginForm, validateRegistrationForm } from '@/validations/validation';

test('validateLoginForm rejects passwords that contain spaces', () => {
  const result = validateLoginForm({
    email: 'driver@example.com',
    password: 'Lesterdriver123! ',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.fieldErrors?.password, 'Passwords cannot contain spaces.');
});

test('validateRegistrationForm rejects passwords that contain spaces', () => {
  const result = validateRegistrationForm({
    username: 'Carl Lester',
    email: 'driver@example.com',
    password: 'Lesterdriver123! ',
    confirmPassword: 'Lesterdriver123! ',
    selectedRole: 'Commuter',
    agreed: true,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.fieldErrors?.password, 'Passwords cannot contain spaces.');
});

test('validateRegistrationForm accepts trimmed multi-word usernames up to twenty characters', () => {
  const result = validateRegistrationForm({
    username: '  Carl Lester  ',
    email: 'driver@example.com',
    password: 'Lesterdriver123!',
    confirmPassword: 'Lesterdriver123!',
    selectedRole: 'Commuter',
    agreed: true,
  });

  assert.equal(result.isValid, true);
});

test('validateRegistrationForm rejects usernames that exceed twenty characters after normalization', () => {
  const result = validateRegistrationForm({
    username: 'Carl Lester The Driver',
    email: 'driver@example.com',
    password: 'Lesterdriver123!',
    confirmPassword: 'Lesterdriver123!',
    selectedRole: 'Commuter',
    agreed: true,
  });

  assert.equal(result.isValid, false);
  assert.equal(result.fieldErrors?.username, 'Use 3 to 20 characters. Letters, numbers, spaces, underscores, and hyphens are allowed.');
});
