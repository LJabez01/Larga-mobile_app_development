// Pending Access Screen - explains the current driver-review state for pending-only accounts.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useRouter, type Href } from 'expo-router';

import { useAppSession } from '@/components/providers/AppSessionProvider';
import {
  getApplicantVisibleReviewNote,
  getDriverApplicationDetail,
} from '@/services/driver-applications/firebase-driver-applications';
import type { DriverApplicationDetail, DriverApplicationStatus } from '@/services/contracts/admin-review';

const PRIMARY = '#10B981';
const TEXT = '#111827';

// Pending Status Config - maps application review status into copy and visual treatment.
function getStatusConfig(status: DriverApplicationStatus) {
  if (status === 'rejected') {
    return {
      title: 'Driver Application Rejected',
      body: 'Your application was reviewed but could not be approved for driver access at this time. Please contact your operations team before trying again.',
      badgeColor: '#DC2626',
      cardBorder: '#FECACA',
      cardAccent: '#B91C1C',
      icon: 'close-thick' as const,
      statusLabel: 'Rejected',
      allowResubmission: false,
    };
  }

  if (status === 'needs_resubmission') {
    return {
      title: 'Update Driver Application',
      body: 'Your reviewer needs updated driver details or a clearer document before driver access can be approved.',
      badgeColor: '#D97706',
      cardBorder: '#FCD34D',
      cardAccent: '#B45309',
      icon: 'file-refresh-outline' as const,
      statusLabel: 'Needs resubmission',
      allowResubmission: true,
    };
  }

  return {
    title: 'Driver Application Received',
    body: 'Your account has been created, and your driver application is now under review. We will unlock driver access after your submitted documents are approved.',
    badgeColor: PRIMARY,
    cardBorder: '#DCFCE7',
    cardAccent: PRIMARY,
    icon: 'clipboard-text-clock-outline' as const,
    statusLabel: 'Pending review',
    allowResubmission: false,
  };
}

// Pending Access Screen - shows driver-review progress for accounts waiting on approval.
export default function PendingAccessScreen() {
  const router = useRouter();
  const { session, signOut, status } = useAppSession();
  const [application, setApplication] = useState<DriverApplicationDetail | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    if (!session?.userId || status !== 'signedIn') {
      return;
    }

    let mounted = true;

    getDriverApplicationDetail(`driver_${session.userId}`)
      .then((nextApplication) => {
        if (!mounted) {
          return;
        }

        setApplication(nextApplication);
        setIsLoadingStatus(false);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setApplication(null);
        setIsLoadingStatus(false);
      });

    return () => {
      mounted = false;
    };
  }, [session?.userId, status]);

  const statusValue = application?.status ?? 'pending';
  const latestReviewNote = useMemo(
    () => getApplicantVisibleReviewNote(application?.reviewNotes ?? []),
    [application?.reviewNotes],
  );
  const config = getStatusConfig(statusValue);

  if (status === 'loading') {
    return <View style={styles.container} />;
  }

  if (status === 'signedOut' || !session) {
    return <Redirect href="/login" />;
  }

  if (!session.hasPendingAccessOnly) {
    return <Redirect href={session.defaultPostLoginRoute as Href} />;
  }

  if (isLoadingStatus) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: config.badgeColor }]}>
        <MaterialCommunityIcons name={config.icon} size={40} color="#fff" />
      </View>
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.body}>{config.body}</Text>
      <View style={[styles.card, { borderColor: config.cardBorder }]}>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={18} color={config.cardAccent} />
          <Text style={styles.cardText}>Status: {config.statusLabel}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="shield-checkmark-outline" size={18} color={PRIMARY} />
          <Text style={styles.cardText}>
            {config.allowResubmission
              ? 'Driver access stays locked until you submit the requested corrections and pass review again.'
              : 'No driver actions are enabled until approval.'}
          </Text>
        </View>
        {latestReviewNote ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Latest reviewer note</Text>
            <Text style={styles.noteText}>{latestReviewNote}</Text>
          </View>
        ) : null}
      </View>
      {config.allowResubmission ? (
        <TouchableOpacity style={styles.button} onPress={() => router.push('/driver-application' as Href)}>
          <Text style={styles.buttonText}>Update Application</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => signOut()}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>{config.allowResubmission ? 'Sign Out' : 'Back to Sign In'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FFFB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  noteCard: {
    marginTop: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  noteLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  noteText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  button: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 220,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#ECFDF3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#087443',
  },
});
