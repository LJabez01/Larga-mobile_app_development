import type { AuthSnapshot } from '@/services/contracts/auth';

interface AuthSnapshotStore {
  getInitialSnapshot(): Promise<AuthSnapshot>;
  publish(snapshot: AuthSnapshot): AuthSnapshot;
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void;
}

// Auth Snapshot Store - withholds signed-in or signed-out state until Firebase finishes initial hydration.
export function createAuthSnapshotStore(): AuthSnapshotStore {
  const listeners = new Set<(snapshot: AuthSnapshot) => void>();
  let currentSnapshot: AuthSnapshot | null = null;
  let resolveInitialSnapshot: (snapshot: AuthSnapshot) => void = () => undefined;
  const initialSnapshotPromise = new Promise<AuthSnapshot>((resolve) => {
    resolveInitialSnapshot = resolve;
  });

  return {
    getInitialSnapshot() {
      return currentSnapshot
        ? Promise.resolve(currentSnapshot)
        : initialSnapshotPromise;
    },

    publish(snapshot) {
      const isInitialSnapshot = currentSnapshot === null;
      currentSnapshot = snapshot;

      if (isInitialSnapshot) {
        resolveInitialSnapshot(snapshot);
      }

      listeners.forEach((listener) => listener(snapshot));
      return snapshot;
    },

    subscribe(listener) {
      listeners.add(listener);

      if (currentSnapshot) {
        listener(currentSnapshot);
      }

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
