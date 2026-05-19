// Admin Review Screen - shows a mobile-first queue of driver verification requests.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useRouter, type Href } from 'expo-router';

import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';
import { subscribeToDriverApplications } from '@/services/admin-review/firebase-admin-review';
import type { DriverApplicationListItem, DriverApplicationStatus } from '@/services/contracts/admin-review';

const PRIMARY = '#0F9D58';
const PRIMARY_DARK = '#087443';
const SURFACE = '#F5FBF7';
const TEXT = '#111827';
const MUTED = '#6B7280';

const FILTERS: Array<{ id: 'all' | DriverApplicationStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'needs_resubmission', label: 'Needs update' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function getStatusPalette(status: DriverApplicationStatus) {
  if (status === 'approved') {
    return {
      background: '#DCFCE7',
      text: '#166534',
      icon: 'shield-checkmark-outline' as const,
      label: 'Approved',
    };
  }

  if (status === 'needs_resubmission') {
    return {
      background: '#FFEDD5',
      text: '#C2410C',
      icon: 'refresh-circle-outline' as const,
      label: 'Needs update',
    };
  }

  if (status === 'rejected') {
    return {
      background: '#FEE2E2',
      text: '#B91C1C',
      icon: 'close-circle-outline' as const,
      label: 'Rejected',
    };
  }

  return {
    background: '#FEF3C7',
    text: '#B45309',
    icon: 'time-outline' as const,
    label: 'Pending',
  };
}

function formatShortDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminReviewScreen() {
  const router = useRouter();
  const { session, signOut, status } = useAppSession();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('pending');
  const [applications, setApplications] = useState<DriverApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'signedIn' || !session?.approvedRoles.includes('admin')) {
      return;
    }

    const unsubscribe = subscribeToDriverApplications(
      (nextApplications) => {
        setApplications(nextApplications);
        setIsLoading(false);
        setError(null);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [session, status]);

  const visibleApplications = useMemo(() => {
    if (filter === 'all') {
      return applications;
    }

    return applications.filter((application) => application.status === filter);
  }, [applications, filter]);

  const summary = useMemo(() => ({
    pending: applications.filter((application) => application.status === 'pending').length,
    needsResubmission: applications.filter((application) => application.status === 'needs_resubmission').length,
    approved: applications.filter((application) => application.status === 'approved').length,
    rejected: applications.filter((application) => application.status === 'rejected').length,
  }), [applications]);

  if (status === 'loading') {
    return (
      <View style={styles.loadingShell}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (status === 'signedOut' || !session) {
    return <Redirect href="/login" />;
  }

  if (!session.approvedRoles.includes('admin')) {
    return <Redirect href={getDefaultAppPath(session) as Href} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={visibleApplications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <View>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <MaterialCommunityIcons name="shield-account-outline" size={22} color="#fff" />
                </View>
                <Pressable
                  style={styles.logoutButton}
                  onPress={async () => {
                    await signOut();
                    router.replace('/login');
                  }}
                >
                  <Ionicons name="log-out-outline" size={18} color="#D1FAE5" />
                </Pressable>
              </View>
              <Text style={styles.heroTitle}>Admin Verification</Text>
              <Text style={styles.heroBody}>
                Review driver account submissions, confirm documents, and unlock trusted driver access.
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{summary.pending}</Text>
                  <Text style={styles.summaryLabel}>Pending</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{summary.approved}</Text>
                  <Text style={styles.summaryLabel}>Approved</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{summary.needsResubmission}</Text>
                  <Text style={styles.summaryLabel}>Needs Update</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{summary.rejected}</Text>
                  <Text style={styles.summaryLabel}>Rejected</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Driver Applications</Text>
              <Text style={styles.sectionCaption}>{visibleApplications.length} visible</Text>
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => {
                const active = item.id === filter;

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setFilter(item.id)}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {isLoading ? (
              <View style={styles.stateCard}>
                <ActivityIndicator color={PRIMARY} />
                <Text style={styles.stateBody}>Loading applications…</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Couldn’t load applications</Text>
                <Text style={styles.errorBody}>{error}</Text>
              </View>
            ) : null}

            {!isLoading && !error && visibleApplications.length === 0 ? (
              <View style={styles.stateCard}>
                <Ionicons name="checkmark-done-circle-outline" size={26} color={PRIMARY} />
                <Text style={styles.stateTitle}>Queue clear</Text>
                <Text style={styles.stateBody}>There are no driver applications in this filter right now.</Text>
              </View>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => {
          const palette = getStatusPalette(item.status);

          return (
            <Pressable
              style={styles.applicationCard}
              onPress={() => router.push(`/admin/application/${item.id}` as Href)}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.identityBlock}>
                  <Text style={styles.applicantName}>{item.applicantName}</Text>
                  <Text style={styles.applicantEmail}>{item.applicantEmail}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: palette.background }]}>
                  <Ionicons name={palette.icon} size={14} color={palette.text} />
                  <Text style={[styles.statusText, { color: palette.text }]}>{palette.label}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <MaterialCommunityIcons name="bus-side" size={14} color={PRIMARY_DARK} />
                  <Text style={styles.metaText}>{item.vehicleType}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Ionicons name="card-outline" size={14} color={PRIMARY_DARK} />
                  <Text style={styles.metaText}>{item.plateNumber}</Text>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                <Text style={styles.timestampText}>Updated {formatShortDate(item.updatedAt)}</Text>
                <Ionicons name="arrow-forward" size={16} color={PRIMARY_DARK} />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  content: {
    paddingBottom: 28,
  },
  hero: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
    backgroundColor: PRIMARY,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 78, 59, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 8,
  },
  heroBody: {
    color: '#D1FAE5',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 14,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCaption: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E7F5EC',
  },
  filterChipActive: {
    backgroundColor: PRIMARY_DARK,
  },
  filterText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
  },
  stateCard: {
    marginHorizontal: 22,
    marginBottom: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DCF2E4',
    alignItems: 'center',
    gap: 8,
  },
  stateTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  stateBody: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorCard: {
    marginHorizontal: 22,
    marginBottom: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  errorBody: {
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 20,
  },
  applicationCard: {
    marginHorizontal: 22,
    marginBottom: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5F3EA',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  identityBlock: {
    flex: 1,
  },
  applicantName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  applicantEmail: {
    color: MUTED,
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F0FDF4',
  },
  metaText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: '700',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
});
