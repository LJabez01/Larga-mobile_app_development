// Firebase Auth Service - implements the real auth adapter for firebase mode.
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from '@/firebase';
import {
  isAppRole,
  normalizeApprovedRoles,
  normalizePendingRoles,
  resolveActiveRole,
  resolveDefaultPostLoginRoute,
  resolvePrimaryRole,
  type AppRole,
  type SelfServiceRole,
} from '@/lib/domain/auth';
import { normalizePasswordInput, normalizeUsernameInput } from '@/lib/domain/auth-inputs';
import { syncUserDisplayName } from '@/services/users';
import type {
  AppSession,
  AuthService,
  AuthSnapshot,
  RegisterInput,
  SignInInput,
} from '@/services/contracts/auth';
import { createAuthSnapshotStore } from '@/services/auth/auth-snapshot-store';
import { createRegistrationProvisioningGate } from '@/services/auth/registration-provisioning';
import { createDriverApplication } from '@/services/driver-applications/firebase-driver-applications';

interface FirebaseUserDocument {
  uid: string;
  role?: AppRole;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  approvedRoles?: AppRole[];
  pendingRoleRequests?: SelfServiceRole[];
  primaryRole?: AppRole | null;
  createdAt: string;
  updatedAt: string;
}

let subscribed = false;
const authSnapshotStore = createAuthSnapshotStore();
const registrationProvisioning = createRegistrationProvisioningGate();

// Snapshot Update - stores the latest auth state and immediately broadcasts it.
function updateSnapshot(snapshot: AuthSnapshot): AuthSnapshot {
  return authSnapshotStore.publish(snapshot);
}

// Registration Role State - translates requested signup role into approved and pending role arrays.
function getRoleStateFromIntent(requestedRole: RegisterInput['requestedRole']) {
  if (requestedRole === 'Driver') {
    return {
      approvedRoles: [] as AppRole[],
      pendingRoleRequests: ['driver'] as SelfServiceRole[],
      primaryRole: 'driver' as AppRole,
    };
  }

  if (requestedRole === 'Both') {
    return {
      approvedRoles: ['commuter'] as AppRole[],
      pendingRoleRequests: ['driver'] as SelfServiceRole[],
      primaryRole: 'commuter' as AppRole,
    };
  }

  return {
    approvedRoles: ['commuter'] as AppRole[],
    pendingRoleRequests: [] as SelfServiceRole[],
    primaryRole: 'commuter' as AppRole,
  };
}

// User Document Normalizer - supports legacy role fields while returning the modern session profile shape.
function normalizeUserDocument(user: Pick<User, 'uid' | 'email' | 'displayName'>, data: Partial<FirebaseUserDocument>, preferredName?: string) {
  const legacyRole = typeof data.role === 'string' && isAppRole(data.role) ? data.role : null;
  const approvedRoles = normalizeApprovedRoles(data.approvedRoles);
  const pendingRoleRequests = normalizePendingRoles(data.pendingRoleRequests);
  const effectiveApprovedRoles = approvedRoles.length > 0
    ? approvedRoles
    : legacyRole
      ? [legacyRole]
      : [];
  const primaryRole = resolvePrimaryRole(data.primaryRole ?? legacyRole, effectiveApprovedRoles, pendingRoleRequests);

  return {
    uid: user.uid,
    email: typeof data.email === 'string' ? data.email : user.email ?? '',
    displayName:
      typeof data.displayName === 'string'
        ? data.displayName
        : resolveDisplayName(user, preferredName),
    phoneNumber: data.phoneNumber ?? null,
    approvedRoles: effectiveApprovedRoles,
    pendingRoleRequests,
    primaryRole,
    createdAt:
      typeof data.createdAt === 'string'
        ? data.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof data.updatedAt === 'string'
        ? data.updatedAt
        : new Date().toISOString(),
  } satisfies Omit<FirebaseUserDocument, 'role'>;
}

// Auth Subscription - starts the one-time Firebase auth observer for session hydration.
function ensureSubscribed() {
  if (subscribed) {
    return;
  }

  subscribed = true;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      updateSnapshot({
        status: 'signedOut',
        session: null,
      });
      return;
    }

    try {
      await registrationProvisioning.wait();

      if (auth.currentUser?.uid !== user.uid) {
        return;
      }

      const userDoc = await ensureUserDocument(user);
      updateSnapshot({
        status: 'signedIn',
        session: toSession(userDoc),
      });
    } catch (error) {
      console.warn('Failed to hydrate Firebase session:', error);
      updateSnapshot({
        status: 'signedOut',
        session: null,
      });
    }
  });
}

// Session Mapper - converts a Firebase user document into the shared app session shape.
function toSession(userDoc: FirebaseUserDocument): AppSession {
  const approvedRoles = normalizeApprovedRoles(userDoc.approvedRoles);
  const pendingRoles = normalizePendingRoles(userDoc.pendingRoleRequests);
  const primaryRole = resolvePrimaryRole(userDoc.primaryRole ?? userDoc.role ?? null, approvedRoles, pendingRoles);
  const activeRole = resolveActiveRole(approvedRoles, primaryRole);
  const availableRoleChoices = approvedRoles.filter((role) => role === 'commuter' || role === 'driver');

  return {
    userId: userDoc.uid,
    role: activeRole,
    displayName: userDoc.displayName,
    email: userDoc.email,
    approvedRoles,
    pendingRoles,
    primaryRole,
    availableRoleChoices,
    defaultPostLoginRoute: resolveDefaultPostLoginRoute(availableRoleChoices, pendingRoles, activeRole),
    needsRoleSelection: availableRoleChoices.length > 1,
    hasPendingAccessOnly: availableRoleChoices.length === 0 && pendingRoles.includes('driver'),
  };
}

// Display Name Helper - chooses the best available name for a Firebase user profile.
function resolveDisplayName(user: Pick<User, 'email' | 'displayName'>, preferredName?: string): string {
  const candidate = preferredName?.trim() || user.displayName?.trim();

  if (candidate) {
    return candidate;
  }

  const localPart = user.email?.split('@')[0]?.trim();

  if (!localPart) {
    return 'LARGA User';
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

// User Document Sync - reads or creates the Firestore user profile for the signed-in account.
async function ensureUserDocument(user: Pick<User, 'uid' | 'email' | 'displayName'>, preferredName?: string) {
  if (!user.email) {
    throw new Error('Signed-in user is missing an email address.');
  }

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const data = snapshot.data() as Partial<FirebaseUserDocument>;

    return normalizeUserDocument(user, data, preferredName);
  }

  const timestamp = new Date().toISOString();
  const userDoc = {
    uid: user.uid,
    email: user.email,
    displayName: resolveDisplayName(user, preferredName),
    phoneNumber: null,
    approvedRoles: ['commuter'] as AppRole[],
    pendingRoleRequests: [] as SelfServiceRole[],
    primaryRole: 'commuter' as AppRole,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await setDoc(userRef, userDoc);

  return userDoc;
}

// Profile Update - persists a new display name to both Firebase Auth and the Firestore user document.
async function updateUserProfileDisplayName(user: User, nextDisplayName: string) {
  const normalizedDisplayName = normalizeUsernameInput(nextDisplayName);

  if (!normalizedDisplayName) {
    throw new Error('Enter your full name before saving.');
  }

  const userRef = doc(db, 'users', user.uid);
  const existingSnapshot = await getDoc(userRef);
  const normalizedUserDoc = existingSnapshot.exists()
    ? normalizeUserDocument(user, existingSnapshot.data() as Partial<FirebaseUserDocument>, normalizedDisplayName)
    : await ensureUserDocument(user, normalizedDisplayName);
  const updatedUserDoc = syncUserDisplayName(normalizedUserDoc, normalizedDisplayName);

  await updateProfile(user, { displayName: normalizedDisplayName });
  await setDoc(userRef, updatedUserDoc);

  return updatedUserDoc;
}

// Firebase Auth Adapter - exposes the shared auth contract using real Firebase behavior.
export const firebaseAuthService: AuthService = {
  // Session Fetch - hydrates the current Firebase user into the shared auth snapshot.
  async getSession() {
    ensureSubscribed();
    return authSnapshotStore.getInitialSnapshot();
  },

  // Session Subscribe - attaches a listener to shared auth state and returns an unsubscribe callback.
  subscribe(listener) {
    ensureSubscribed();
    return authSnapshotStore.subscribe(listener);
  },

  // Firebase Sign In - authenticates credentials and syncs the matching Firestore profile.
  async signIn(input: SignInInput) {
    ensureSubscribed();
    const credential = await signInWithEmailAndPassword(
      auth,
      input.email.trim(),
      normalizePasswordInput(input.password),
    );
    const userDoc = await ensureUserDocument(credential.user);

    return updateSnapshot({
      status: 'signedIn',
      session: toSession(userDoc),
    });
  },

  // Firebase Register - creates the auth user, profile, and driver application when needed.
  async register(input: RegisterInput) {
    ensureSubscribed();
    return registrationProvisioning.run(async () => {
      const normalizedDisplayName = normalizeUsernameInput(input.displayName);
      const normalizedPassword = normalizePasswordInput(input.password);
      const credential = await createUserWithEmailAndPassword(
        auth,
        input.email.trim(),
        normalizedPassword,
      );

      try {
        if (normalizedDisplayName) {
          await updateProfile(credential.user, { displayName: normalizedDisplayName });
        }

        const timestamp = new Date().toISOString();
        const roleState = getRoleStateFromIntent(input.requestedRole);
        const userDoc: FirebaseUserDocument = {
          uid: credential.user.uid,
          email: credential.user.email ?? input.email.trim(),
          displayName: resolveDisplayName(credential.user, normalizedDisplayName),
          phoneNumber: null,
          approvedRoles: roleState.approvedRoles,
          pendingRoleRequests: roleState.pendingRoleRequests,
          primaryRole: roleState.primaryRole,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await setDoc(doc(db, 'users', credential.user.uid), userDoc);

        if (roleState.pendingRoleRequests.includes('driver')) {
          await createDriverApplication(credential.user.uid, input);
        }

        return updateSnapshot({
          status: 'signedIn',
          session: toSession(userDoc),
        });
      } catch (error) {
        await deleteUser(credential.user);
        throw error;
      }
    });
  },

  // Password Reset Request - sends Firebase's reset email to the requested account.
  async requestPasswordReset(input) {
    await sendPasswordResetEmail(auth, input.email.trim());
  },

  // Profile Update - saves the signed-in user's display name and refreshes the shared session snapshot.
  async updateProfile(input) {
    ensureSubscribed();

    if (!auth.currentUser) {
      throw new Error('Sign in again to update your profile.');
    }

    const userDoc = await updateUserProfileDisplayName(auth.currentUser, input.displayName);

    return updateSnapshot({
      status: 'signedIn',
      session: toSession(userDoc),
    });
  },

  // Firebase Sign Out - clears the active user and publishes a signed-out snapshot.
  async signOut() {
    await firebaseSignOut(auth);

    return updateSnapshot({
      status: 'signedOut',
      session: null,
    });
  },

  // Auth Reset - signs out any current user and resets local auth state for tests/dev flows.
  async reset() {
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }

    updateSnapshot({
      status: 'signedOut',
      session: null,
    });
  },
};
