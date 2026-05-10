import { useRouter } from 'expo-router';
import NotificationsScreen from '@/components/notifications';

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <NotificationsScreen
      userRole="commuter"
      onBack={() => router.replace('/commuter')}
    />
  );
}


