export type NotificationType = 'info' | 'warning' | 'success' | 'alert';

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

