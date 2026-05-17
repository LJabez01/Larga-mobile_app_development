export type NotificationType = 'info' | 'warning' | 'success' | 'alert';

// Notification Contracts - defines the shared notification shape used by app screens.
export interface NotificationItem {
  id: string;
  section?: string;
  title: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  icon?: string;
  read: boolean;
}
