import assert from 'node:assert/strict';
import test from 'node:test';

import { createRegistrationProvisioningGate } from '@/services/auth/registration-provisioning';

test('registration provisioning blocks auth hydration until the profile write finishes', async () => {
  const gate = createRegistrationProvisioningGate();
  let finishProvisioning: () => void = () => undefined;
  let hydrationContinued = false;

  const registration = gate.run(
    () => new Promise<void>((resolve) => {
      finishProvisioning = resolve;
    }),
  );
  const hydration = gate.wait().then(() => {
    hydrationContinued = true;
  });

  await Promise.resolve();
  assert.equal(hydrationContinued, false);

  finishProvisioning();
  await registration;
  await hydration;

  assert.equal(hydrationContinued, true);
});

test('registration provisioning releases auth hydration after a failed profile write', async () => {
  const gate = createRegistrationProvisioningGate();
  const expectedError = new Error('profile write failed');

  await assert.rejects(
    gate.run(async () => {
      throw expectedError;
    }),
    expectedError,
  );

  await gate.wait();
});
