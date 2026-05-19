// Admin Account Seed Script - provisions or updates the trusted Firebase admin account for app review access.
import fs from 'node:fs';

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { loadOptionalEnvFile, resolveTransportSeedConfig } from '@/lib/seed/transport-catalog-sync';

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

function resolveAdminSeedInput(cwd: string) {
  const config = resolveTransportSeedConfig(process.argv.slice(2), cwd);
  const seedEnv = loadOptionalEnvFile(config.envFilePath);
  const localEnv = loadOptionalEnvFile(`${cwd}\\.env.local`);
  const combinedEnv = {
    ...process.env,
    ...localEnv,
    ...seedEnv,
  };

  const email = combinedEnv.FIREBASE_ADMIN_EMAIL?.trim();
  const password = combinedEnv.FIREBASE_ADMIN_PASSWORD?.trim();
  const displayName = combinedEnv.FIREBASE_ADMIN_DISPLAY_NAME?.trim() || 'LARGA Admin';

  if (!email || !password) {
    throw new Error(
      'Missing FIREBASE_ADMIN_EMAIL or FIREBASE_ADMIN_PASSWORD. Set them in .env.seed.local or pass them through the environment.',
    );
  }

  return {
    config,
    email,
    password,
    displayName,
  };
}

async function main() {
  const input = resolveAdminSeedInput(process.cwd());

  if (!input.config.apply) {
    console.log(`Admin seed dry run for project ${input.config.projectId}`);
    console.log(`Env file: ${input.config.envFilePath}`);
    console.log(`Target: ${input.config.usesEmulator ? 'Firebase emulator' : 'real Firebase project'}`);
    console.log(`Admin email: ${input.email}`);
    console.log('Run with --apply to provision or update the admin account.');
    return;
  }

  const app = getAdminApp(
    input.config.projectId,
    input.config.serviceAccountPath,
    input.config.usesEmulator,
  );
  const adminAuth = getAuth(app);
  const adminDb = getFirestore(app);

  let userRecord;

  try {
    userRecord = await adminAuth.getUserByEmail(input.email);
    userRecord = await adminAuth.updateUser(userRecord.uid, {
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
      disabled: false,
    });
  } catch {
    userRecord = await adminAuth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
    });
  }

  const timestamp = new Date().toISOString();

  await adminDb.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: input.email,
    displayName: input.displayName,
    phoneNumber: null,
    approvedRoles: ['admin'],
    pendingRoleRequests: [],
    primaryRole: 'admin',
    createdAt: timestamp,
    updatedAt: timestamp,
  }, { merge: true });

  console.log(`Admin account ready: ${input.email}`);
}

main().catch((error) => {
  console.error('Failed to seed admin account:', error);
  process.exitCode = 1;
});
