import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';

export type NotificationType = 'info' | 'warning' | 'success' | 'alert';

export interface Notification {
  id: string;
  section?: string;
  title: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  icon?: string;
  read: boolean;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface NotificationCardProps {
  notification: Notification;
  onPress?: () => void;
  onToggleRead?: (id: string, read: boolean) => void;
}

const typeConfig = {
  info: {
    bgColor: '#dbeafe',
    textColor: '#1d4ed8',
    accentColor: '#2563eb',
    label: 'Arrival',
    icon: 'information-circle',
  },
  warning: {
    bgColor: '#fef3c7',
    textColor: '#b45309',
    accentColor: '#d97706',
    label: 'Heads up',
    icon: 'warning',
  },
  success: {
    bgColor: '#dcfce7',
    textColor: '#15803d',
    accentColor: '#16a34a',
    label: 'Confirmed',
    icon: 'checkmark-circle',
  },
  alert: {
    bgColor: '#fee2e2',
    textColor: '#dc2626',
    accentColor: '#ef4444',
    label: 'Urgent',
    icon: 'alert-circle',
  },
};

export default function NotificationCard({ notification, onPress, onToggleRead }: NotificationCardProps) {
  const config = typeConfig[notification.type];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleRead = () => {
    onToggleRead?.(notification.id, !notification.read);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          !notification.read && styles.cardUnread,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={[styles.accentRail, { backgroundColor: config.accentColor }]} />

        <View style={[styles.iconWrap, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon as any} size={24} color={config.textColor} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{notification.title}</Text>
            {!notification.read && <View style={[styles.unreadDot, { backgroundColor: config.accentColor }]} />}
          </View>
          <Text style={[styles.typeLabel, { color: config.accentColor }]}>{config.label}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <View style={styles.footerRow}>
            <Text style={styles.timestamp}>{notification.timestamp}</Text>
            {notification.section ? <Text style={styles.sectionTag}>{notification.section}</Text> : null}
          </View>
        </View>

        {onToggleRead ? (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleToggleRead}
              style={styles.toggleButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={notification.read ? 'ellipse-outline' : 'ellipse'}
                size={16}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#f8fafc',
  },
  accentRail: {
    width: 4,
    borderRadius: 999,
    alignSelf: 'stretch',
    marginRight: 12,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  sectionTag: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  toggleButton: {
    padding: 8,
  },
});
