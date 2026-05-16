import assert from 'node:assert/strict';

import { deleteApp as deleteAdminApp, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getFirestore, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { deleteApp as deleteClientApp, getApps as getClientApps, initializeApp as initializeClientApp } from 'firebase/app';

import { serializeRouteCoordinates } from '@/lib/domain/transport';
import { ROUTE_SEED, TERMINAL_SEED } from '@/lib/seed/transport-catalog';

const projectId = process.env.GCLOUD_PROJECT || 'demo-no-project';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const [firestoreHostname, firestorePortText] = firestoreHost.split(':');
const firestorePort = Number.parseInt(firestorePortText, 10);

function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({ projectId });
}

function createClient(name: string) {
  const app = initializeClientApp(
    {
      apiKey: 'demo-key',
      authDomain: 'demo.firebaseapp.com',
      projectId,
      appId: `${name}-app`,
    },
    name,
  );

  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });

  const db = getFirestore(app);
  connectFirestoreEmulator(db, firestoreHostname, firestorePort);

  return { auth, db };
}

async function expectDenied(action: Promise<unknown>) {
  try {
    await action;
  } catch (error) {
    assert.equal(error instanceof Error, true);
    return;
  }

  assert.fail('Expected the Firestore rule to deny the action.');
}

async function expectAllowed(action: Promise<unknown>) {
  await action;
}

async function seedCatalog() {
  const adminDb = getAdminFirestore(getAdminApp());
  const batch = adminDb.batch();

  TERMINAL_SEED.forEach((terminal) => {
    batch.set(adminDb.collection('terminals').doc(terminal.id), terminal);
  });

  ROUTE_SEED.forEach((route) => {
    batch.set(adminDb.collection('routes').doc(route.id), {
      ...route,
      coordinates: serializeRouteCoordinates(route.coordinates),
    });
  });

  await batch.commit();
}

async function createSignedInUser(email: string, password: string, role: 'commuter' | 'driver' | 'admin') {
  const adminApp = getAdminApp();
  const adminAuth = getAdminAuth(adminApp);
  const adminDb = getAdminFirestore(adminApp);

  let userRecord;

  try {
    userRecord = await adminAuth.getUserByEmail(email);
  } catch {
    userRecord = await adminAuth.createUser({ email, password });
  }

  await adminDb.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    role,
    email,
    displayName: email.split('@')[0],
    phoneNumber: null,
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
  });

  const client = createClient(`${role}-${userRecord.uid}`);

  try {
    await createUserWithEmailAndPassword(client.auth, email, password);
  } catch {
  }

  await signInWithEmailAndPassword(client.auth, email, password);

  return {
    uid: userRecord.uid,
    db: client.db,
  };
}

async function cleanupApps() {
  await Promise.all(getClientApps().map((app) => deleteClientApp(app)));
  await Promise.all(getApps().map((app) => deleteAdminApp(app)));
}

async function main() {
  try {
    await seedCatalog();

    const driver = await createSignedInUser('driver@larga.test', 'password123', 'driver');
    const commuter = await createSignedInUser('commuter@larga.test', 'password123', 'commuter');
    const admin = await createSignedInUser('admin@larga.test', 'password123', 'admin');

    const tripPayload = {
      driverId: driver.uid,
      routeId: 'sta-maria-bayan-halang',
      originTerminalId: 'sta-maria-bayan',
      destinationTerminalId: 'halang-terminal',
      status: 'active',
      startedAt: '2026-05-12T01:00:00.000Z',
      updatedAt: '2026-05-12T01:00:00.000Z',
    };

    await expectAllowed(
      setDoc(doc(driver.db, 'activeTrips', driver.uid), tripPayload),
    );

    await expectDenied(
      setDoc(doc(commuter.db, 'activeTrips', commuter.uid), {
        ...tripPayload,
        driverId: commuter.uid,
      }),
    );

    await expectDenied(
      setDoc(doc(driver.db, 'activeTrips', `${driver.uid}-second`), tripPayload),
    );

    const driverLocationPayload = {
      driverId: driver.uid,
      tripId: driver.uid,
      routeId: 'sta-maria-bayan-halang',
      latitude: 14.8459,
      longitude: 120.9978,
      heading: 0,
      speed: 18,
      accuracy: 5,
      recordedAt: '2026-05-12T01:01:00.000Z',
      updatedAt: '2026-05-12T01:01:00.000Z',
    };

    await expectAllowed(
      setDoc(doc(driver.db, 'vehicleLocations', driver.uid), driverLocationPayload),
    );

    await expectDenied(
      setDoc(doc(driver.db, 'vehicleLocations', `${driver.uid}-other`), driverLocationPayload),
    );

    await expectDenied(
      setDoc(doc(driver.db, 'vehicleLocations', driver.uid), {
        ...driverLocationPayload,
        routeId: 'sta-maria-bayan-norzagaray',
      }),
    );

    await expectAllowed(
      addDoc(collection(driver.db, 'tripEvents'), {
        tripId: driver.uid,
        driverId: driver.uid,
        routeId: 'sta-maria-bayan-halang',
        eventType: 'trip_started',
        recordedAt: '2026-05-12T01:01:30.000Z',
        metadata: {
          originTerminalId: 'sta-maria-bayan',
          destinationTerminalId: 'halang-terminal',
        },
      }),
    );

    await expectDenied(
      addDoc(collection(commuter.db, 'tripEvents'), {
        tripId: commuter.uid,
        driverId: commuter.uid,
        routeId: 'sta-maria-bayan-halang',
        eventType: 'trip_started',
        recordedAt: '2026-05-12T01:01:30.000Z',
        metadata: {},
      }),
    );

    await expectAllowed(
      addDoc(collection(driver.db, 'tripEvents'), {
        tripId: driver.uid,
        driverId: driver.uid,
        routeId: 'sta-maria-bayan-halang',
        eventType: 'trip_ended',
        recordedAt: '2026-05-12T01:02:00.000Z',
        metadata: {
          endedAt: '2026-05-12T01:02:00.000Z',
        },
      }),
    );

    await expectAllowed(
      deleteDoc(doc(driver.db, 'vehicleLocations', driver.uid)),
    );

    await expectAllowed(
      deleteDoc(doc(driver.db, 'activeTrips', driver.uid)),
    );

    await expectAllowed(
      deleteDoc(doc(admin.db, 'activeTrips', driver.uid)),
    );

    console.log('Rules smoke test passed.');
  } finally {
    await cleanupApps();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
