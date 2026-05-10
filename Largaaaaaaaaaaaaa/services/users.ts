import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { AppRole } from '@/lib/domain/auth';
import { isAppUserDocument, type AppUserDocument } from '@/lib/domain/users';

export interface EnsureUserOptions {
  readonly displayName?: string | null;
}

interface BuildUserDocumentInput {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly role?: AppRole;
  readonly now?: string;
}

export function buildFallbackDisplayName(email: string): string {
  const localPart = email.split('@')[0]?.trim() ?? '';

  if (!localPart) {
    return 'LARGA User';
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function buildUserDocument(input: BuildUserDocumentInput): AppUserDocument {
  const timestamp = input.now ?? new Date().toISOString();

  return {
    uid: input.uid,
    role: input.role ?? 'commuter',
    email: input.email,
    displayName: input.displayName.trim(),
    phoneNumber: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function resolveDisplayName(user: Pick<User, 'email' | 'displayName'>, preferredName?: string | null): string {
  const candidate = preferredName?.trim() || user.displayName?.trim();

  if (candidate) {
    return candidate;
  }

  if (!user.email) {
    return 'LARGA User';
  }

  return buildFallbackDisplayName(user.email);
}

function parseUserDocument(value: unknown): AppUserDocument {
  if (!isAppUserDocument(value)) {
    throw new Error('User profile is missing required fields.');
  }

  return value;
}

function getDb(): Firestore {
  const { db } = require('../firebase') as { db: Firestore };

  return db;
}

export async function getUserDocument(uid: string): Promise<AppUserDocument | null> {
  const snapshot = await getDoc(doc(getDb(), 'users', uid));

  if (!snapshot.exists()) {
    return null;
  }

  return parseUserDocument(snapshot.data());
}

export async function ensureUserDocument(
  user: Pick<User, 'uid' | 'email' | 'displayName'>,
  options: EnsureUserOptions = {}
): Promise<AppUserDocument> {
  const existingUser = await getUserDocument(user.uid);

  if (existingUser) {
    return existingUser;
  }

  if (!user.email) {
    throw new Error('Signed-in user is missing an email address.');
  }

  const profile = buildUserDocument({
    uid: user.uid,
    email: user.email,
    displayName: resolveDisplayName(user, options.displayName),
  });

  await setDoc(doc(getDb(), 'users', user.uid), profile);

  return profile;
}
