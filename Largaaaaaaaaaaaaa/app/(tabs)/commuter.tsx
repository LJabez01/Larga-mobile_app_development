// Commuter Tab Screen - mounts the commuter map experience and shows driver-application status when relevant.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import CommuterMapScreen from '@/components/map/commuter/commutermapscreen';
import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';
import {
  getApplicantVisibleReviewNote,
  getDriverApplicationDetail,
} from '@/services/driver-applications/firebase-driver-applications';
import type { DriverApplicationDetail } from '@/services/contracts/admin-review';

// Application Banner Config - maps pending driver review status into commuter-facing banner UI.
function getBannerConfig(status: DriverApplicationDetail['status']) {
  if (status === 'rejected') {
    return {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
      iconColor: '#B91C1C',
      title: 'Driver access rejected',
      cta: null,
    };
  }

  if (status === 'needs_resubmission') {
    return {
      backgroundColor: '#FFF7ED',
      borderColor: '#FED7AA',
      iconColor: '#C2410C',
      title: 'Driver update requested',
      cta: 'Update application',
    };
  }

  return {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    iconColor: '#087443',
    title: 'Driver review in progress',
    cta: null,
  };
}

// Commuter Screen - hosts the commuter map and any pending driver-application notice.
export default function CommuterScreen() {
  const router = useRouter();
  const { session, status } = useAppSession();
  const [application, setApplication] = useState<DriverApplicationDetail | null>(null);

  useEffect(() => {
    if (status !== 'signedIn' || !session?.userId || !session.pendingRoles.includes('driver')) {
      setApplication(null);
      return;
    }

    let mounted = true;

    getDriverApplicationDetail(`driver_${session.userId}`)
      .then((nextApplication) => {
        if (mounted) {
          setApplication(nextApplication);
        }
      })
      .catch(() => {
        if (mounted) {
          setApplication(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [session?.pendingRoles, session?.userId, status]);

  const bannerConfig = useMemo(
    () => (application ? getBannerConfig(application.status) : null),
    [application],
  );
  const latestReviewNote = useMemo(
    () => getApplicantVisibleReviewNote(application?.reviewNotes ?? []),
    [application?.reviewNotes],
  );

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  if (status === 'signedOut' || !session) {
    return <Redirect href="/login" />;
  }

  if (session.needsRoleSelection && session.role === null) {
    return <Redirect href="/role-selection" />;
  }

  if (!session.approvedRoles.includes('commuter')) {
    return <Redirect href={getDefaultAppPath(session) as Href} />;
  }

  return (
    <View style={styles.container}>
      <CommuterMapScreen />
      {application && bannerConfig ? (
        <View style={[styles.bannerShell, { backgroundColor: bannerConfig.backgroundColor, borderColor: bannerConfig.borderColor }]}>
          <View style={styles.bannerRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={bannerConfig.iconColor} />
            <Text style={styles.bannerTitle}>{bannerConfig.title}</Text>
          </View>
          <Text style={styles.bannerBody}>
            {latestReviewNote
              ? latestReviewNote
              : application.status === 'pending'
                ? 'Your driver verification is still being reviewed.'
                : 'Your driver account needs attention before it can be approved.'}
          </Text>
          {bannerConfig.cta ? (
            <Pressable style={styles.bannerButton} onPress={() => router.push('/driver-application' as Href)}>
              <Text style={styles.bannerButtonText}>{bannerConfig.cta}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bannerShell: {
    position: 'absolute',
    top: 96,
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bannerTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  bannerBody: {
    color: '#374151',
    fontSize: 12,
    lineHeight: 18,
  },
  bannerButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#0F9D58',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
