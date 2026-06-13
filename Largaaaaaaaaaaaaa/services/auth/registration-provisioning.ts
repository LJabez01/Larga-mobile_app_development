interface RegistrationProvisioningGate {
  run<T>(operation: () => Promise<T>): Promise<T>;
  wait(): Promise<void>;
}

// Registration Provisioning Gate - prevents auth hydration from racing profile creation.
export function createRegistrationProvisioningGate(): RegistrationProvisioningGate {
  let pendingProvisioning: Promise<void> | null = null;
  let finishProvisioning: () => void = () => undefined;

  return {
    async run(operation) {
      if (pendingProvisioning) {
        throw new Error('Account registration is already in progress.');
      }

      pendingProvisioning = new Promise<void>((resolve) => {
        finishProvisioning = resolve;
      });

      try {
        return await operation();
      } finally {
        finishProvisioning();
        pendingProvisioning = null;
        finishProvisioning = () => undefined;
      }
    },

    async wait() {
      await pendingProvisioning;
    },
  };
}
