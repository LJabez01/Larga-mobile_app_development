import fs from 'node:fs';

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { buildTransportSeedPayload, resolveTransportSeedConfig } from '@/lib/seed/transport-catalog-sync';

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

async function main() {
  const config = resolveTransportSeedConfig(process.argv.slice(2), process.cwd());
  const payload = buildTransportSeedPayload();

  if (!config.apply) {
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
