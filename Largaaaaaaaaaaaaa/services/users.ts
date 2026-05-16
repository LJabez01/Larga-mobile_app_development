import type { User } from 'firebase/auth';
import { doc, getDoc, runTransaction, type Firestore } from 'firebase/firestore';
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

export function shouldSyncDisplayName(
  profile: AppUserDocument,
  nextDisplayName?: string | null
): boolean {
  const normalizedDisplayName = nextDisplayName?.trim();

  return Boolean(normalizedDisplayName && normalizedDisplayName !== profile.displayName);
}

export function syncUserDisplayName(
  profile: AppUserDocument,
  nextDisplayName: string,
  now?: string
): AppUserDocument {
  const normalizedDisplayName = nextDisplayName.trim();

  if (!normalizedDisplayName || normalizedDisplayName === profile.displayName) {
    return profile;
  }

  return {
    ...profile,
    displayName: normalizedDisplayName,
    updatedAt: now ?? new Date().toISOString(),
  };
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
  if (!user.email) {
    throw new Error('Signed-in user is missing an email address.');
  }
  const userEmail = user.email;
  const preferredDisplayName: string = resolveDisplayName(user, options.displayName);

  return runTransaction(getDb(), async (transaction) => {
    const userRef = doc(getDb(), 'users', user.uid);
    const existingSnapshot = await transaction.get(userRef);

    if (existingSnapshot.exists()) {
      const existingProfile = parseUserDocument(existingSnapshot.data());

      if (!shouldSyncDisplayName(existingProfile, preferredDisplayName)) {
        return existingProfile;
      }

      const updatedProfile = syncUserDisplayName(existingProfile, preferredDisplayName);
      transaction.set(userRef, updatedProfile);
      return updatedProfile;
    }

    const profile = buildUserDocument({
      uid: user.uid,
      email: userEmail,
      displayName: preferredDisplayName,
    });

    transaction.set(userRef, profile);
    return profile;
  });
}
