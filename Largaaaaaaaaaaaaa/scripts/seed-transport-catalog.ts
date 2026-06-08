// Transport Seed Script - syncs the coded terminal and route catalog into Firestore.
import fs from 'node:fs';

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { buildTransportSeedPayload, resolveTransportSeedConfig } from '@/lib/seed/transport-catalog-sync';

// Admin App Factory - initializes Firebase Admin for emulator or live Firestore catalog sync.
function getAdminApp(projectId: string, serviceAccountPath: string | null, usesEmulator: boolean) {
  if (getApps().length > 0) {
    return getApp();
  }

  if (!usesEmulator && serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  }

  return initializeApp({
    projectId,
  });
}

// Comparison Normalizer - sorts object keys recursively before seed-vs-live comparisons.
function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForComparison(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((normalized, key) => {
        normalized[key] = normalizeForComparison((value as Record<string, unknown>)[key]);
        return normalized;
      }, {});
  }

  return value;
}

// Seed Field Equality Check - compares normalized seed and Firestore field values.
function areSeedFieldValuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(normalizeForComparison(left)) === JSON.stringify(normalizeForComparison(right));
}

// Document Diff Builder - reports missing or changed Firestore seed fields.
function buildDocumentDiff(
  collectionName: string,
  documentId: string,
  expectedData: Record<string, unknown>,
  liveData: Record<string, unknown> | null,
) {
  if (!liveData) {
    return `${collectionName}/${documentId} is missing from Firestore.`;
  }

  const changedFields = Object.keys(expectedData).filter(
    (field) => !areSeedFieldValuesEqual(expectedData[field], liveData[field]),
  );

  if (changedFields.length === 0) {
    return null;
  }

  return `${collectionName}/${documentId} differs on: ${changedFields.join(', ')}`;
}

// Transport Seed Entry Point - dry-runs, checks, or writes the terminal and route catalog.
async function main() {
  const config = resolveTransportSeedConfig(process.argv.slice(2), process.cwd());
  const payload = buildTransportSeedPayload();

  if (!config.apply && !config.checkLive) {
    console.log(`Transport seed dry run for project ${config.projectId}`);
    console.log(`Env file: ${config.envFilePath}`);
    console.log(`Target: ${config.usesEmulator ? 'Firestore emulator' : 'real Firebase project'}`);
    console.log(`Terminals: ${payload.terminals.length}`);
    console.log(`Routes: ${payload.routes.length}`);
    console.log('Document IDs to write:');

    payload.terminals.forEach((terminal) => {
      console.log(`  terminals/${terminal.id}`);
    });

    payload.routes.forEach((route) => {
      console.log(`  routes/${route.id}`);
    });

    console.log('');
    console.log('Run with --apply to write this catalog.');
    return;
  }

  const app = getAdminApp(config.projectId, config.serviceAccountPath, config.usesEmulator);
  const db = getFirestore(app);

  if (config.checkLive) {
    const terminalRefs = payload.terminals.map((terminal) => db.collection('terminals').doc(terminal.id));
    const routeRefs = payload.routes.map((route) => db.collection('routes').doc(route.id));
    const terminalSnapshots = await db.getAll(...terminalRefs);
    const routeSnapshots = await db.getAll(...routeRefs);
    const diffs = [
      ...payload.terminals.flatMap((terminal, index) => {
        const snapshot = terminalSnapshots[index];
        const diff = buildDocumentDiff(
          'terminals',
          terminal.id,
          terminal.data as unknown as Record<string, unknown>,
          snapshot?.exists ? snapshot.data() as Record<string, unknown> : null,
        );

        return diff ? [diff] : [];
      }),
      ...payload.routes.flatMap((route, index) => {
        const snapshot = routeSnapshots[index];
        const diff = buildDocumentDiff(
          'routes',
          route.id,
          route.data,
          snapshot?.exists ? snapshot.data() as Record<string, unknown> : null,
        );

        return diff ? [diff] : [];
      }),
    ];

    if (diffs.length === 0) {
      console.log(`Live transport catalog matches repo seed for project ${config.projectId}.`);
      return;
    }

    console.log(`Live transport catalog differs from repo seed for project ${config.projectId}:`);
    diffs.forEach((diff) => {
      console.log(`  - ${diff}`);
    });
    process.exitCode = 1;
    return;
  }

  const batch = db.batch();

  payload.terminals.forEach((terminal) => {
    batch.set(db.collection('terminals').doc(terminal.id), terminal.data);
  });

  payload.routes.forEach((route) => {
    batch.set(db.collection('routes').doc(route.id), route.data);
  });

  await batch.commit();

  console.log(`Seeded ${payload.terminals.length} terminals and ${payload.routes.length} routes to project ${config.projectId}.`);
}

main().catch((error) => {
  console.error('Failed to seed transport catalog:', error);
  process.exitCode = 1;
});
