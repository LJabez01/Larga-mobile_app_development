// Live Data Service Selector - chooses the active live-data adapter for the current app mode.
import type { LiveDataService } from '@/services/contracts/live-data';
import { isMockMode } from '@/services/runtime/app-mode';

export const liveDataService: LiveDataService = isMockMode()
  ? (require('./mock-live-data') as { mockLiveDataService: LiveDataService }).mockLiveDataService
  : (require('./firebase-live-data') as { firebaseLiveDataService: LiveDataService }).firebaseLiveDataService;
