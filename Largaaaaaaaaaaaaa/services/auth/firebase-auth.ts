import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from '@/firebase';
import type {
  AppRole,
  AppSession,
  AuthService,
  AuthSnapshot,
  DemoRole,
  RegisterInput,
  SignInInput,
} from '@/services/contracts/auth';

interface FirebaseUserDocument {
  uid: string;
  role: AppRole;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

const listeners = new Set<(snapshot: AuthSnapshot) => void>();

let subscribed = false;
let currentSnapshot: AuthSnapshot = {
  status: 'signedOut',
  session: null,
};

function notify() {
  listeners.forEach((listener) => listener(currentSnapshot));
}

function updateSnapshot(snapshot: AuthSnapshot): AuthSnapshot {
  currentSnapshot = snapshot;
  notify();
  return currentSnapshot;
}

function isAppRole(value: unknown): value is AppRole {
  return value === 'commuter' || value === 'driver' || value === 'admin';
}

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

function toSession(userDoc: FirebaseUserDocument): AppSession {
  return {
    userId: userDoc.uid,
    role: userDoc.role,
    displayName: userDoc.displayName,
    email: userDoc.email,
    mode: 'firebase',
  };
}

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

async function ensureUserDocument(user: Pick<User, 'uid' | 'email' | 'displayName'>, preferredName?: string) {
  if (!user.email) {
    throw new Error('Signed-in user is missing an email address.');
  }

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const data = snapshot.data() as Partial<FirebaseUserDocument>;

    return {
      uid: user.uid,
      role: isAppRole(data.role) ? data.role : 'commuter',
      email: typeof data.email === 'string' ? data.email : user.email,
      displayName:
        typeof data.displayName === 'string'
          ? data.displayName
          : resolveDisplayName(user, preferredName),
      phoneNumber: data.phoneNumber ?? null,
      createdAt:
        typeof data.createdAt === 'string'
          ? data.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof data.updatedAt === 'string'
          ? data.updatedAt
          : new Date().toISOString(),
    } satisfies FirebaseUserDocument;
  }

  const timestamp = new Date().toISOString();
  const userDoc: FirebaseUserDocument = {
    uid: user.uid,
    role: 'commuter',
    email: user.email,
    displayName: resolveDisplayName(user, preferredName),
    phoneNumber: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await setDoc(userRef, userDoc);

  return userDoc;
}

export const firebaseAuthService: AuthService = {
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

  subscribe(listener) {
    ensureSubscribed();
    listeners.add(listener);
    listener(currentSnapshot);

    return () => {
      listeners.delete(listener);
    };
  },

  async signIn(input: SignInInput) {
    ensureSubscribed();
    const credential = await signInWithEmailAndPassword(auth, input.email.trim(), input.password);
    const userDoc = await ensureUserDocument(credential.user);

    return updateSnapshot({
      status: 'signedIn',
      session: toSession(userDoc),
    });
  },

  async register(input: RegisterInput) {
    ensureSubscribed();
    const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);

    if (input.displayName.trim()) {
      await updateProfile(credential.user, { displayName: input.displayName.trim() });
    }

    const userDoc = await ensureUserDocument(credential.user, input.displayName);

    return updateSnapshot({
      status: 'signedIn',
      session: toSession(userDoc),
    });
  },

  async requestPasswordReset(input) {
    await sendPasswordResetEmail(auth, input.email.trim());
  },

  async signOut() {
    await firebaseSignOut(auth);

    return updateSnapshot({
      status: 'signedOut',
      session: null,
    });
  },

  async startDemoSession(_role: DemoRole) {
    throw new Error('Developer demo sessions are only available in mock mode.');
  },

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

