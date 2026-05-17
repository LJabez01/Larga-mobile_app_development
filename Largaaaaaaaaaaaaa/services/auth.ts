// Legacy Auth Helpers - preserves the older Firebase auth utility functions.
import type { AuthError } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  updateProfile,
} from 'firebase/auth';

import { ensureUserDocument } from '@/services/users';

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export interface RegisterCommuterInput extends SignInInput {
  readonly displayName: string;
}

function getAuthInstance(): Auth {
  const { auth } = require('../firebase') as { auth: Auth };

  return auth;
}

function isFirebaseError(error: unknown): error is AuthError {
  return (
    Boolean(error) &&
    typeof error === 'object' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

export function getAuthErrorMessage(error: unknown): string {
  if (!isFirebaseError(error)) {
    return 'Something went wrong. Please try again.';
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'That email is already in use.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a bit before trying again.';
    case 'auth/weak-password':
      return 'Password is too weak for Firebase Auth.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export async function signInWithEmail(input: SignInInput): Promise<void> {
  await signInWithEmailAndPassword(
    getAuthInstance(),
    input.email.trim(),
    input.password
  );
}

export async function registerCommuter(input: RegisterCommuterInput): Promise<void> {
  const credential = await createUserWithEmailAndPassword(
    getAuthInstance(),
    input.email.trim(),
    input.password
  );

  const trimmedDisplayName = input.displayName.trim();

  if (trimmedDisplayName) {
    await updateProfile(credential.user, {
      displayName: trimmedDisplayName,
    });
  }

  await ensureUserDocument(credential.user, {
    displayName: trimmedDisplayName,
  });
}

export async function sendPasswordReset(input: Pick<SignInInput, 'email'>): Promise<void> {
  await sendPasswordResetEmail(getAuthInstance(), input.email.trim());
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(getAuthInstance());
}
