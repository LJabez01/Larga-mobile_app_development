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
import type {
  AppSession,
  AuthService,
  AuthSnapshot,
  RegisterInput,
  SignInInput,
} from '@/services/contracts/auth';
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

const listeners = new Set<(snapshot: AuthSnapshot) => void>();

let subscribed = false;
let currentSnapshot: AuthSnapshot = {
  status: 'signedOut',
  session: null,
};

// Snapshot Broadcast - sends the latest auth snapshot to all active listeners.
function notify() {
  listeners.forEach((listener) => listener(currentSnapshot));
}

// Snapshot Update - stores the latest auth state and immediately broadcasts it.
function updateSnapshot(snapshot: AuthSnapshot): AuthSnapshot {
  currentSnapshot = snapshot;
  notify();
  return currentSnapshot;
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

// Firebase Auth Adapter - exposes the shared auth contract using real Firebase behavior.
export const firebaseAuthService: AuthService = {
  // Session Fetch - hydrates the current Firebase user into the shared auth snapshot.
  async getSession() {
    ensureSubscribed();

    if (!auth.currentUser) {
      return currentSnapshot;
    }

    const userDoc = await ensureUserDocument(auth.currentUser);

    return updateSnapshot({
      status: 'signedIn',
      session: toSession(userDoc),
    });
  },

  // Session Subscribe - attaches a listener to shared auth state and returns an unsubscribe callback.
  subscribe(listener) {
    ensureSubscribed();
    listeners.add(listener);
    listener(currentSnapshot);

    return () => {
      listeners.delete(listener);
    };
  },

  // Firebase Sign In - authenticates credentials and syncs the matching Firestore profile.
  async signIn(input: SignInInput) {
    ensureSubscribed();
    const credential = await signInWithEmailAndPassword(auth, input.email.trim(), input.password);
    const userDoc = await ensureUserDocument(credential.user);

    return updateSnapshot({
      status: 'signedIn',
      session: toSession(userDoc),
    });
  },

  // Firebase Register - creates the auth user, profile, and driver application when needed.
  async register(input: RegisterInput) {
    ensureSubscribed();
    const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);

    try {
      if (input.displayName.trim()) {
        await updateProfile(credential.user, { displayName: input.displayName.trim() });
      }

      const timestamp = new Date().toISOString();
      const roleState = getRoleStateFromIntent(input.requestedRole);
      const userDoc: FirebaseUserDocument = {
        uid: credential.user.uid,
        email: credential.user.email ?? input.email.trim(),
        displayName: resolveDisplayName(credential.user, input.displayName),
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
  },

  // Password Reset Request - sends Firebase's reset email to the requested account.
  async requestPasswordReset(input) {
    await sendPasswordResetEmail(auth, input.email.trim());
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
