import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTransportSeedPayload, parseEnvFileContents, resolveTransportSeedConfig } from '@/lib/seed/transport-catalog-sync';

test('parseEnvFileContents reads key value pairs and ignores comments', () => {
  const values = parseEnvFileContents(`
# Comment
FIREBASE_PROJECT_ID=larga-mobile-app-23265
FIREBASE_SERVICE_ACCOUNT_PATH="C:\\\\keys\\\\service.json"
`);

  assert.equal(values.FIREBASE_PROJECT_ID, 'larga-mobile-app-23265');
  assert.equal(values.FIREBASE_SERVICE_ACCOUNT_PATH, 'C:\\\\keys\\\\service.json');
});

test('buildTransportSeedPayload serializes route coordinates as firestore-safe objects', () => {
  const payload = buildTransportSeedPayload();
  const routeCoordinates = payload.routes[0]?.data.coordinates as Array<Record<string, unknown>> | undefined;
  const firstRouteCoordinate = routeCoordinates?.[0];

  assert.ok(firstRouteCoordinate);
  assert.equal(typeof firstRouteCoordinate.longitude, 'number');
  assert.equal(typeof firstRouteCoordinate.latitude, 'number');
});

test('resolveTransportSeedConfig supports emulator seeding without service account path', () => {
  const config = resolveTransportSeedConfig(
    [],
    'C:\\workspace',
    {
      FIREBASE_PROJECT_ID: 'demo-no-project',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    },
  );

  assert.equal(config.apply, false);
  assert.equal(config.usesEmulator, true);
  assert.equal(config.projectId, 'demo-no-project');
});
