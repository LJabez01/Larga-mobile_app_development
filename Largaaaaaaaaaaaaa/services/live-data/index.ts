// Live Data Service Selector - exports the Firebase live-data adapter as the only runtime service.
import type { LiveDataService } from '@/services/contracts/live-data';
import { firebaseLiveDataService } from '@/services/live-data/firebase-live-data';

export const liveDataService: LiveDataService = firebaseLiveDataService;
