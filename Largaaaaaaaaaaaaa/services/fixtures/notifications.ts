// Notification Fixtures - provide mock notifications for commuter and driver flows.
import type { NotificationItem } from '@/services/contracts/notifications';

export const COMMUTER_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'commuter-1',
    section: 'Today',
    title: 'Route ready',
    message: 'Your selected route is live in mock mode for UI testing.',
    timestamp: '2 min ago',
    type: 'success',
    read: false,
  },
  {
    id: 'commuter-2',
    section: 'Earlier',
    title: 'Vehicle approaching',
    message: 'A mock vehicle is moving closer to your selected route.',
    timestamp: '45 min ago',
    type: 'info',
    read: true,
  },
];

export const DRIVER_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'driver-1',
    section: 'Today',
    title: 'Demo trip control',
    message: 'Use Start Trip to simulate a live driver session for UI testing.',
    timestamp: '1 min ago',
    type: 'warning',
    read: false,
  },
  {
    id: 'driver-2',
    section: 'Earlier',
    title: 'Mock route selected',
    message: 'Your active route and commuter visibility are driven by shared mock state.',
    timestamp: '1 hr ago',
    type: 'info',
    read: true,
  },
];
