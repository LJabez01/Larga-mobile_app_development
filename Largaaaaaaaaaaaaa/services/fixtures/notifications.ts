// Notification Fixtures - provide baseline notifications for commuter and driver flows.
import type { NotificationItem } from '@/services/contracts/notifications';

export const COMMUTER_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'commuter-1',
    section: 'Today',
    title: 'Route ready',
    message: 'Your selected route is active and ready for live trip visibility.',
    timestamp: '2 min ago',
    type: 'success',
    read: false,
  },
  {
    id: 'commuter-2',
    section: 'Earlier',
    title: 'Vehicle approaching',
    message: 'A vehicle is moving closer to your selected route.',
    timestamp: '45 min ago',
    type: 'info',
    read: true,
  },
];

export const DRIVER_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'driver-1',
    section: 'Today',
    title: 'Trip control ready',
    message: 'Use Start Trip when you are ready to begin broadcasting your live route session.',
    timestamp: '1 min ago',
    type: 'warning',
    read: false,
  },
  {
    id: 'driver-2',
    section: 'Earlier',
    title: 'Route selected',
    message: 'Your active route controls the commuter visibility for your current live session.',
    timestamp: '1 hr ago',
    type: 'info',
    read: true,
  },
];
