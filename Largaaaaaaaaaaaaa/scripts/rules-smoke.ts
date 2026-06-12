// Rules Smoke Script - validates the Firestore rules with emulator-backed scenarios.
import assert from 'node:assert/strict';

import { deleteApp as deleteAdminApp, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, where, connectFirestoreEmulator } from 'firebase/firestore';
import { deleteApp as deleteClientApp, getApps as getClientApps, initializeApp as initializeClientApp } from 'firebase/app';

import { serializeRouteCoordinates } from '@/lib/domain/transport';
import { ROUTE_SEED, TERMINAL_SEED } from '@/lib/seed/transport-catalog';
import type { AppRole, SelfServiceRole } from '@/lib/domain/auth';

const projectId = process.env.GCLOUD_PROJECT || 'demo-no-project';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const [firestoreHostname, firestorePortText] = firestoreHost.split(':');
const firestorePort = Number.parseInt(firestorePortText, 10);

// Admin App Factory - reuses or creates the emulator-backed Firebase Admin app.
function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({ projectId });
}

// Client App Factory - creates an isolated Firebase client connected to Auth and Firestore emulators.
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

// Denied Assertion - passes only when a Firestore operation is rejected by rules.
async function expectDenied(action: Promise<unknown>) {
  try {
    await action;
  } catch (error) {
    assert.equal(error instanceof Error, true);
    return;
  }

  assert.fail('Expected the Firestore rule to deny the action.');
}

// Allowed Assertion - awaits operations that should pass Firestore rules.
async function expectAllowed(action: Promise<unknown>) {
  await action;
}

// Catalog Seeder - writes terminal and route seed records into the emulator before rules checks.
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

// Signed-In Test User Factory - creates auth, user profile, and client db handles for one role scenario.
async function createSignedInUser(
  email: string,
  password: string,
  approvedRoles: AppRole[],
  pendingRoleRequests: SelfServiceRole[] = [],
) {
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
    email,
    displayName: email.split('@')[0],
    phoneNumber: null,
    approvedRoles,
    pendingRoleRequests,
    primaryRole: approvedRoles[0] ?? (pendingRoleRequests[0] === 'driver' ? 'driver' : null),
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
  });

  const client = createClient(`${approvedRoles.join('-') || pendingRoleRequests.join('-')}-${userRecord.uid}`);

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

// Firebase App Cleanup - tears down all Admin and client apps created during smoke tests.
async function cleanupApps() {
  await Promise.all(getClientApps().map((app) => deleteClientApp(app)));
  await Promise.all(getApps().map((app) => deleteAdminApp(app)));
}

// Rules Smoke Entry Point - runs representative allow/deny scenarios against Firestore rules.
async function main() {
  try {
    await seedCatalog();

    const driver = await createSignedInUser('driver@larga.test', 'password123', ['driver']);
    const otherDriver = await createSignedInUser('driver-2@larga.test', 'password123', ['driver']);
    const commuter = await createSignedInUser('commuter@larga.test', 'password123', ['commuter']);
    const admin = await createSignedInUser('admin@larga.test', 'password123', ['admin']);
    const pendingDriver = await createSignedInUser('pending-driver@larga.test', 'password123', [], ['driver']);
    const legacyCommuter = await createSignedInUser('legacy-commuter@larga.test', 'password123', []);

    await getAdminFirestore(getAdminApp()).collection('users').doc(legacyCommuter.uid).set({
      role: 'commuter',
      primaryRole: 'commuter',
    }, { merge: true });

    await expectAllowed(
      setDoc(doc(commuter.db, 'users', commuter.uid), {
        uid: commuter.uid,
        email: 'commuter@larga.test',
        displayName: 'commuter',
        phoneNumber: null,
        approvedRoles: ['commuter'],
        pendingRoleRequests: ['driver'],
        primaryRole: 'commuter',
        createdAt: '2026-05-12T00:00:00.000Z',
        updatedAt: '2026-05-12T00:01:00.000Z',
      }),
    );

    await expectAllowed(
      setDoc(doc(pendingDriver.db, 'roleApplications', `driver_${pendingDriver.uid}`), {
        uid: pendingDriver.uid,
        requestedRole: 'driver',
        status: 'pending',
        submittedAt: '2026-05-12T00:02:00.000Z',
        updatedAt: '2026-05-12T00:02:00.000Z',
        documents: {
          vehicleType: 'Jeepney',
          plateNumber: 'ABC1234',
          licenseNumber: 'A12-34-123456',
          idImagePath: 'driver-applications/demo-id.jpg',
          idImageUrl: 'https://example.test/driver-applications/demo-id.jpg',
        },
        reviewNotes: [],
      }),
    );

    await expectDenied(
      setDoc(doc(pendingDriver.db, 'users', pendingDriver.uid), {
        uid: pendingDriver.uid,
        email: 'pending-driver@larga.test',
        displayName: 'pending-driver',
        phoneNumber: null,
        approvedRoles: ['driver'],
        pendingRoleRequests: [],
        primaryRole: 'driver',
        createdAt: '2026-05-12T00:00:00.000Z',
        updatedAt: '2026-05-12T00:03:00.000Z',
      }),
    );

    await expectDenied(
      setDoc(doc(commuter.db, 'roleApplications', `driver_${pendingDriver.uid}`), {
        uid: pendingDriver.uid,
        requestedRole: 'driver',
        status: 'approved',
        submittedAt: '2026-05-12T00:02:00.000Z',
        updatedAt: '2026-05-12T00:05:00.000Z',
        documents: {
          vehicleType: 'Jeepney',
          plateNumber: 'ABC1234',
          licenseNumber: 'A12-34-123456',
          idImagePath: 'driver-applications/demo-id.jpg',
          idImageUrl: 'https://example.test/driver-applications/demo-id.jpg',
        },
        reviewNotes: ['attempted escalation'],
      }),
    );

    await expectAllowed(
      setDoc(doc(admin.db, 'roleApplications', `driver_${pendingDriver.uid}`), {
        uid: pendingDriver.uid,
        requestedRole: 'driver',
        status: 'needs_resubmission',
        submittedAt: '2026-05-12T00:02:00.000Z',
        updatedAt: '2026-05-12T00:04:00.000Z',
        documents: {
          vehicleType: 'Jeepney',
          plateNumber: 'ABC1234',
          licenseNumber: 'A12-34-123456',
          idImagePath: 'driver-applications/demo-id.jpg',
          idImageUrl: 'https://example.test/driver-applications/demo-id.jpg',
        },
        reviewNotes: ['Please upload a clearer ID image'],
      }),
    );

    await expectAllowed(
      setDoc(doc(pendingDriver.db, 'roleApplications', `driver_${pendingDriver.uid}`), {
        uid: pendingDriver.uid,
        requestedRole: 'driver',
        status: 'pending',
        submittedAt: '2026-05-12T00:02:00.000Z',
        updatedAt: '2026-05-12T00:04:30.000Z',
        documents: {
          vehicleType: 'Jeepney',
          plateNumber: 'ABC1234',
          licenseNumber: 'A12-34-123456',
          idImagePath: 'driver-applications/demo-id-2.jpg',
          idImageUrl: 'https://example.test/driver-applications/demo-id-2.jpg',
        },
        reviewNotes: ['Please upload a clearer ID image'],
      }),
    );

    await expectAllowed(
      setDoc(doc(admin.db, 'roleApplications', `driver_${pendingDriver.uid}`), {
        uid: pendingDriver.uid,
        requestedRole: 'driver',
        status: 'approved',
        submittedAt: '2026-05-12T00:02:00.000Z',
        updatedAt: '2026-05-12T00:05:00.000Z',
        documents: {
          vehicleType: 'Jeepney',
          plateNumber: 'ABC1234',
          licenseNumber: 'A12-34-123456',
          idImagePath: 'driver-applications/demo-id.jpg',
          idImageUrl: 'https://example.test/driver-applications/demo-id.jpg',
        },
        reviewNotes: ['approved by admin'],
      }),
    );

    await expectAllowed(
      setDoc(doc(admin.db, 'users', pendingDriver.uid), {
        uid: pendingDriver.uid,
        email: 'pending-driver@larga.test',
        displayName: 'pending-driver',
        phoneNumber: null,
        approvedRoles: ['driver'],
        pendingRoleRequests: [],
        primaryRole: 'driver',
        createdAt: '2026-05-12T00:00:00.000Z',
        updatedAt: '2026-05-12T00:05:00.000Z',
      }),
    );

    const tripPayload = {
      driverId: driver.uid,
      routeId: 'sta-maria-bayan-halang',
      originTerminalId: 'sta-maria-bayan',
      destinationTerminalId: 'halang-terminal',
      originLocationId: 'new-santa-maria-jeepney-terminal',
      destinationLocationId: 'halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal',
      routeProgressSegmentIndex: null,
      status: 'active',
      startedAt: '2026-05-12T01:00:00.000Z',
      updatedAt: '2026-05-12T01:00:00.000Z',
    };

    await expectAllowed(
      setDoc(doc(driver.db, 'activeTrips', driver.uid), tripPayload),
    );

    await expectAllowed(
      setDoc(doc(otherDriver.db, 'activeTrips', otherDriver.uid), {
        ...tripPayload,
        driverId: otherDriver.uid,
        routeId: 'sta-maria-bayan-norzagaray',
        destinationTerminalId: 'norzagaray-terminal',
        destinationLocationId: 'norzagaray-terminal',
      }),
    );

    await expectAllowed(
      getDoc(doc(driver.db, 'activeTrips', driver.uid)),
    );

    await expectDenied(
      getDoc(doc(commuter.db, 'activeTrips', driver.uid)),
    );

    await expectDenied(
      getDocs(collection(commuter.db, 'activeTrips')),
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

    await expectAllowed(
      setDoc(doc(driver.db, 'activeTrips', driver.uid), {
        ...tripPayload,
        routeProgressSegmentIndex: 8,
        updatedAt: '2026-05-12T01:00:30.000Z',
      }),
    );

    await expectDenied(
      setDoc(doc(driver.db, 'activeTrips', driver.uid), {
        ...tripPayload,
        routeId: 'sta-maria-bayan-norzagaray',
        routeProgressSegmentIndex: 8,
        updatedAt: '2026-05-12T01:00:31.000Z',
      }),
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

    await expectAllowed(
      setDoc(doc(otherDriver.db, 'vehicleLocations', otherDriver.uid), {
        ...driverLocationPayload,
        driverId: otherDriver.uid,
        tripId: otherDriver.uid,
        routeId: 'sta-maria-bayan-norzagaray',
      }),
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

    const commuterPresencePayload = {
      commuterId: commuter.uid,
      status: 'waiting',
      latitude: 14.8465,
      longitude: 120.9983,
      referenceSource: 'gps',
      nearbyRouteIds: ['sta-maria-bayan-halang'],
      recordedAt: '2026-05-12T01:01:10.000Z',
      updatedAt: '2026-05-12T01:01:10.000Z',
    };

    await expectAllowed(
      setDoc(doc(commuter.db, 'commuterPresence', commuter.uid), commuterPresencePayload),
    );

    await expectAllowed(
      setDoc(doc(legacyCommuter.db, 'commuterPresence', legacyCommuter.uid), {
        ...commuterPresencePayload,
        commuterId: legacyCommuter.uid,
      }),
    );

    await expectAllowed(
      setDoc(
        doc(commuter.db, 'routeCommuterPresence', 'sta-maria-bayan-halang', 'commuters', commuter.uid),
        commuterPresencePayload,
      ),
    );

    await expectAllowed(
      getDocs(query(
        collection(commuter.db, 'vehicleLocations'),
        where('routeId', 'in', ['sta-maria-bayan-halang']),
      )),
    );

    await expectDenied(
      getDocs(collection(commuter.db, 'vehicleLocations')),
    );

    await expectDenied(
      getDocs(query(
        collection(commuter.db, 'vehicleLocations'),
        where('routeId', 'in', ['sta-maria-bayan-norzagaray']),
      )),
    );

    await expectDenied(
      setDoc(doc(driver.db, 'commuterPresence', driver.uid), {
        ...commuterPresencePayload,
        commuterId: driver.uid,
      }),
    );

    await expectAllowed(
      getDocs(collection(driver.db, 'routeCommuterPresence', 'sta-maria-bayan-halang', 'commuters')),
    );

    await expectDenied(
      getDocs(collection(driver.db, 'routeCommuterPresence', 'sta-maria-bayan-norzagaray', 'commuters')),
    );

    await expectAllowed(
      deleteDoc(doc(commuter.db, 'routeCommuterPresence', 'sta-maria-bayan-halang', 'commuters', commuter.uid)),
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

    await expectDenied(
      getDocs(collection(driver.db, 'routeCommuterPresence', 'sta-maria-bayan-halang', 'commuters')),
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
