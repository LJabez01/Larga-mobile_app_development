import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  terminate,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-larga.firebaseapp.com',
  projectId: 'demo-larga',
  storageBucket: 'demo-larga.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:demo'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

connectAuthEmulator(auth, 'http://127.0.0.1:9099');
connectFirestoreEmulator(db, '127.0.0.1', 8080);

function toFirestoreValue(value) {
  if (value === null) {
    return { nullValue: null };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [
          key,
          toFirestoreValue(nestedValue)
        ])
      )
    }
  };
}

async function seedDocument(collection, docId, data) {
  const response = await fetch(
    `http://127.0.0.1:8080/v1/projects/demo-larga/databases/(default)/documents/${collection}/${docId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])
        )
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to seed ${collection}/${docId}: ${response.status} ${await response.text()}`
    );
  }
}

async function expectDenied(operation, message) {
  let denied = false;

  try {
    await operation();
  } catch {
    denied = true;
  }

  if (!denied) {
    throw new Error(message);
  }
}

try {
  const credential = await createUserWithEmailAndPassword(
    auth,
    'commuter@example.com',
    'Passw0rd!'
  );

  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    role: 'commuter',
    email: 'commuter@example.com',
    displayName: 'Commuter User',
    phoneNumber: null,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z'
  });

  await seedDocument('terminals', 'santa-maria-bayan', {
    id: 'santa-maria-bayan',
    name: 'Santa Maria Bayan',
    latitude: 14.8186,
    longitude: 120.9567,
    isActive: true,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z'
  });

  await expectDenied(
    () =>
      updateDoc(doc(db, 'users', credential.user.uid), {
        role: 'driver',
        updatedAt: '2026-05-10T00:05:00.000Z'
      }),
    'Expected client-side role escalation to be denied by rules.'
  );

  const terminalSnapshot = await getDoc(doc(db, 'terminals', 'santa-maria-bayan'));

  if (!terminalSnapshot.exists()) {
    throw new Error('Expected signed-in users to be able to read terminals.');
  }

  const driverCredential = await createUserWithEmailAndPassword(
    auth,
    'driver@example.com',
    'Passw0rd!'
  );

  await seedDocument('users', driverCredential.user.uid, {
    uid: driverCredential.user.uid,
    role: 'driver',
    email: 'driver@example.com',
    displayName: 'Driver User',
    phoneNumber: '09171234567',
    createdAt: '2026-05-10T00:10:00.000Z',
    updatedAt: '2026-05-10T00:10:00.000Z'
  });

  await setDoc(doc(db, 'activeTrips', driverCredential.user.uid), {
    driverId: driverCredential.user.uid,
    routeId: 'sm-bayan-poblacion-northbound',
    status: 'active',
    startedAt: '2026-05-10T00:15:00.000Z',
    updatedAt: '2026-05-10T00:15:00.000Z'
  });

  await expectDenied(
    () =>
      setDoc(doc(db, 'activeTrips', 'second-trip-doc'), {
        driverId: driverCredential.user.uid,
        routeId: 'sm-bayan-poblacion-southbound',
        status: 'active',
        startedAt: '2026-05-10T00:16:00.000Z',
        updatedAt: '2026-05-10T00:16:00.000Z'
      }),
    'Expected creating a second active trip under a different document id to be denied.'
  );

  await setDoc(doc(db, 'vehicleLocations', driverCredential.user.uid), {
    driverId: driverCredential.user.uid,
    tripId: driverCredential.user.uid,
    routeId: 'sm-bayan-poblacion-northbound',
    latitude: 14.8186,
    longitude: 120.9567,
    heading: null,
    speed: null,
    accuracy: null,
    recordedAt: '2026-05-10T00:16:30.000Z',
    updatedAt: '2026-05-10T00:16:30.000Z'
  });

  await expectDenied(
    () =>
      setDoc(doc(db, 'vehicleLocations', driverCredential.user.uid), {
        driverId: driverCredential.user.uid,
        tripId: driverCredential.user.uid,
        routeId: 'sm-bayan-poblacion-northbound',
        latitude: '14.8186',
        longitude: 120.9567,
        heading: null,
        speed: null,
        accuracy: null,
        recordedAt: '2026-05-10T00:17:00.000Z',
        updatedAt: '2026-05-10T00:17:00.000Z'
    }),
    'Expected malformed vehicle location data to be denied by rules.'
  );

  await expectDenied(
    () =>
      setDoc(doc(db, 'vehicleLocations', driverCredential.user.uid), {
        driverId: 'forged-driver-id',
        tripId: driverCredential.user.uid,
        routeId: 'sm-bayan-poblacion-northbound',
        latitude: 14.8186,
        longitude: 120.9567,
        heading: null,
        speed: null,
        accuracy: null,
        recordedAt: '2026-05-10T00:17:30.000Z',
        updatedAt: '2026-05-10T00:17:30.000Z'
      }),
    'Expected vehicle location ownership forgery to be denied by rules.'
  );

  await expectDenied(
    () =>
      setDoc(doc(db, 'vehicleLocations', driverCredential.user.uid), {
        driverId: driverCredential.user.uid,
        tripId: driverCredential.user.uid,
        routeId: 'sm-bayan-poblacion-southbound',
        latitude: 14.8186,
        longitude: 120.9567,
        heading: null,
        speed: null,
        accuracy: null,
        recordedAt: '2026-05-10T00:17:45.000Z',
        updatedAt: '2026-05-10T00:17:45.000Z'
      }),
    'Expected vehicle location route forgery to be denied by rules.'
  );

  await setDoc(doc(db, 'tripEvents', 'event-valid'), {
    tripId: driverCredential.user.uid,
    driverId: driverCredential.user.uid,
    routeId: 'sm-bayan-poblacion-northbound',
    eventType: 'trip_started',
    recordedAt: '2026-05-10T00:17:50.000Z',
    metadata: {
      source: 'client'
    }
  });

  await expectDenied(
    () =>
      setDoc(doc(db, 'tripEvents', 'event-1'), {
        tripId: driverCredential.user.uid,
        driverId: driverCredential.user.uid,
        routeId: 'sm-bayan-poblacion-northbound',
        eventType: 'trip_started',
        recordedAt: '2026-05-10T00:18:00.000Z',
        metadata: 'invalid'
    }),
    'Expected malformed trip event data to be denied by rules.'
  );

  await expectDenied(
    () =>
      setDoc(doc(db, 'tripEvents', 'event-2'), {
        tripId: 'forged-trip-id',
        driverId: driverCredential.user.uid,
        routeId: 'sm-bayan-poblacion-northbound',
        eventType: 'trip_started',
        recordedAt: '2026-05-10T00:18:30.000Z',
        metadata: {
          source: 'client'
        }
      }),
    'Expected forged trip ownership fields to be denied by rules.'
  );

  await expectDenied(
    () =>
      setDoc(doc(db, 'tripEvents', 'event-3'), {
        tripId: driverCredential.user.uid,
        driverId: 'forged-driver-id',
        routeId: 'sm-bayan-poblacion-northbound',
        eventType: 'trip_started',
        recordedAt: '2026-05-10T00:19:00.000Z',
        metadata: {
          source: 'client'
        }
      }),
    'Expected forged driver ownership fields to be denied by rules.'
  );

  await expectDenied(
    () =>
      setDoc(doc(db, 'tripEvents', 'event-4'), {
        tripId: driverCredential.user.uid,
        driverId: driverCredential.user.uid,
        routeId: 'sm-bayan-poblacion-southbound',
        eventType: 'trip_started',
        recordedAt: '2026-05-10T00:19:30.000Z',
        metadata: {
          source: 'client'
        }
      }),
    'Expected trip event route forgery to be denied by rules.'
  );

  console.log('Rules smoke test passed.');
} finally {
  await signOut(auth).catch(() => {});
  await terminate(db).catch(() => {});
  await deleteApp(app).catch(() => {});
}
