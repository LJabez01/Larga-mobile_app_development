import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NotificationCard from './NotificationCard';
import type { NotificationItem } from '@/services/contracts/notifications';

interface NotificationsScreenProps {
  userRole?: 'driver' | 'commuter';
  onBack?: () => void;
  notifications?: NotificationItem[];
}

const COMMUTER_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    section: 'Today',
    title: 'Account verified',
    message: 'Your account has been verified. You can now enjoy full access to the app.',
    timestamp: '2 min ago',
    type: 'success',
    read: false,
  },
  {
    id: '2',
    section: 'Today',
    title: 'Pickup point updated',
    message: 'Your pickup point was adjusted to the corner stop for a smoother arrival.',
    timestamp: '12 min ago',
    type: 'warning',
    read: false,
  },
  {
    id: '3',
    section: 'Earlier',
    title: 'Trip completed',
    message: 'Your morning trip has been marked complete. Thanks for riding with us.',
    timestamp: '1 hr ago',
    type: 'success',
    read: true,
  },
  {
    id: '4',
    section: 'Earlier',
    title: 'Service notice',
    message: 'A route adjustment may save about 10 minutes on your next ride.',
    timestamp: '3 hrs ago',
    type: 'success',
    read: true,
  },
];

const DRIVER_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    section: 'Today',
    title: 'New passenger request',
    message: 'A commuter requested pickup from San Miguel. Accept or decline?',
    timestamp: '1 min ago',
    type: 'alert',
    read: false,
  },
  {
    id: '2',
    section: 'Today',
    title: 'Vehicle check reminder',
    message: 'Your inspection is due in 5 days. Keep the jeep road-ready.',
    timestamp: '30 min ago',
    type: 'warning',
    read: false,
  },
  {
    id: '3',
    section: 'Earlier',
    title: 'Earnings summary',
    message: 'You earned ₱2,450 today. Weekly total is now ₱15,800.',
    timestamp: '5 hrs ago',
    type: 'success',
    read: true,
  },
  {
    id: '4',
    section: 'Earlier',
    title: 'Route optimized',
    message: 'A faster route is available for your current trip. Save 10 minutes.',
    timestamp: '1 day ago',
    type: 'info',
    read: true,
  },
];

export default function NotificationsScreen({
  userRole = 'commuter',
  onBack,
  notifications: providedNotifications,
}: NotificationsScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread'>('all');

  const notifications =
    providedNotifications ??
    (userRole === 'driver' ? DRIVER_NOTIFICATIONS : COMMUTER_NOTIFICATIONS);

  const filteredNotifications =
    selectedFilter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const sections = useMemo(() => {
    return filteredNotifications.reduce<Array<{ title: string; data: NotificationItem[] }>>(
      (result, notification) => {
        const sectionTitle = notification.section ?? 'Updates';
        const existingSection = result.find((entry) => entry.title === sectionTitle);

        if (existingSection) {
          existingSection.data.push(notification);
        } else {
          result.push({ title: sectionTitle, data: [notification] });
        }

        return result;
      },
      [],
    );
  }, [filteredNotifications]);

  const pageTitle = 'Notifications';
  const pageSubtitle =
    userRole === 'driver'
      ? 'Track passenger requests, reminders, and route changes in one place.'
      : '';

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.topBar}>
              {onBack ? (
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={22} color="#0f172a" />
                </TouchableOpacity>
              ) : (
                <View style={styles.backBtnPlaceholder} />
              )}
              <View style={styles.topBarCenter}>
                <Text style={styles.headerEyebrow}>Notifications</Text>
                <Text style={styles.headerTitle}>{pageTitle}</Text>
              </View>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.pageLabel}>Recent activity</Text>
            {pageSubtitle ? <Text style={styles.pageSubtitle}>{pageSubtitle}</Text> : null}

            <View style={styles.filterBar}>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  selectedFilter === 'all' && styles.filterBtnActive,
                ]}
                onPress={() => setSelectedFilter('all')}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === 'all' && styles.filterTextActive,
                  ]}
                >
                  All updates
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  selectedFilter === 'unread' && styles.filterBtnActive,
                ]}
                onPress={() => setSelectedFilter('unread')}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === 'unread' && styles.filterTextActive,
                  ]}
                >
                  Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            onPress={() => {
              console.log('Tapped notification:', item.id);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color="#94a3b8"
              />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyMessage}>
              {selectedFilter === 'unread'
                ? 'You are all caught up for now.'
                : 'Check back later for new notifications.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  backBtnPlaceholder: {
    width: 44,
    height: 44,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerStack: {
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 10,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  pageLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  filterBtnActive: {
    backgroundColor: '#0f172a',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 96,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
  },
});
