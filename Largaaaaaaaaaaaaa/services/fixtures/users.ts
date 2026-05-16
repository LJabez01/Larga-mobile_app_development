import type { DemoRole } from '@/services/contracts/auth';

export interface DemoUserFixture {
  role: DemoRole;
  email: string;
  displayName: string;
}

export const DEMO_USERS: Record<DemoRole, DemoUserFixture> = {
  commuter: {
    role: 'commuter',
    email: 'commuter.demo@larga.test',
    displayName: 'Commuter Demo',
  },
  driver: {
    role: 'driver',
    email: 'driver.demo@larga.test',
    displayName: 'Driver Demo',
  },
};
