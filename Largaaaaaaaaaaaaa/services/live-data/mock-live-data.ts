// Mock Live Data Service - exposes the mock store through the shared live-data interface.
import type { LiveDataService } from '@/services/contracts/live-data';
import { mockLiveDataStore } from '@/services/live-data/mock-store';

export const mockLiveDataService: LiveDataService = {
  async getSnapshot() {
    return mockLiveDataStore.getSnapshot();
  },

  subscribe(listener) {
    return mockLiveDataStore.subscribe(listener);
  },

  async selectDriverTerminals(originTerminalId: string | null, destinationTerminalId: string | null) {
    return mockLiveDataStore.selectDriverTerminals(originTerminalId, destinationTerminalId);
  },

  async startTrip() {
    return mockLiveDataStore.startTrip();
  },

  async endTrip() {
    return mockLiveDataStore.endTrip();
  },

  async publishDriverLocation(input) {
    return mockLiveDataStore.publishDriverLocation(input);
  },

  async reset() {
    return mockLiveDataStore.reset();
  },
};
