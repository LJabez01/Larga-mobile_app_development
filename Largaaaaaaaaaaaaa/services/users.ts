// Legacy User Helpers - preserves the older Firestore user document utilities.
import type { User } from 'firebase/auth';
import { doc, getDoc, runTransaction, type Firestore } from 'firebase/firestore';
import type { AppRole, SelfServiceRole } from '@/lib/domain/auth';
import { isAppUserDocument, type AppUserDocument } from '@/lib/domain/users';

export interface EnsureUserOptions {
  readonly displayName?: string | null;
}

interface BuildUserDocumentInput {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly approvedRoles?: AppRole[];
  readonly pendingRoleRequests?: SelfServiceRole[];
  readonly primaryRole?: AppRole | null;
  readonly now?: string;
}

// Fallback Display Name - derives a readable name from an email when no profile name exists.
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

// User Document Builder - creates the default Firestore profile for a newly signed-in user.
export function buildUserDocument(input: BuildUserDocumentInput): AppUserDocument {
  const timestamp = input.now ?? new Date().toISOString();
  const approvedRoles = input.approvedRoles ?? ['commuter'];
  const pendingRoleRequests = input.pendingRoleRequests ?? [];

  return {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName.trim(),
    phoneNumber: null,
    approvedRoles,
    pendingRoleRequests,
    primaryRole: input.primaryRole ?? approvedRoles[0] ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

// Display Name Resolver - chooses a preferred, provider, or email-derived display name.
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

// Display Name Sync Check - detects when a stored profile should receive a newer display name.
export function shouldSyncDisplayName(
  profile: AppUserDocument,
  nextDisplayName?: string | null
): boolean {
  const normalizedDisplayName = nextDisplayName?.trim();

  return Boolean(normalizedDisplayName && normalizedDisplayName !== profile.displayName);
}

// Display Name Sync - returns an updated profile when the incoming display name is meaningful.
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

// User Document Parser - enforces the app user profile contract on Firestore reads.
function parseUserDocument(value: unknown): AppUserDocument {
  if (!isAppUserDocument(value)) {
    throw new Error('User profile is missing required fields.');
  }

  return value;
}

// Firestore Instance Loader - resolves the legacy Firestore singleton only when user helpers are used.
function getDb(): Firestore {
  const { db } = require('../firebase') as { db: Firestore };

  return db;
}

// User Document Lookup - reads and validates one user profile by uid.
export async function getUserDocument(uid: string): Promise<AppUserDocument | null> {
  const snapshot = await getDoc(doc(getDb(), 'users', uid));

  if (!snapshot.exists()) {
    return null;
  }

  return parseUserDocument(snapshot.data());
}

// User Document Upsert - creates the profile once and later syncs only safe display-name changes.
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
