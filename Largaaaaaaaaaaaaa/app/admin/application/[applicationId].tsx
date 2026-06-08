// Admin Review Detail Screen - lets admins inspect and verify one driver application.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';
import {
  reviewDriverApplication,
} from '@/services/admin-review/firebase-admin-review';
import type { DriverApplicationDetail } from '@/services/contracts/admin-review';
import { getDriverApplicationDetail } from '@/services/driver-applications/firebase-driver-applications';

const PRIMARY = '#0F9D58';
const PRIMARY_DARK = '#087443';
const TEXT = '#111827';
const MUTED = '#6B7280';

// Long Date Formatter - formats application timestamps for the detail review screen.
function formatLongDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

// Admin Application Detail Screen - loads one driver application for review decisions.
export default function AdminApplicationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ applicationId?: string }>();
  const { session, status } = useAppSession();
  const [application, setApplication] = useState<DriverApplicationDetail | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!params.applicationId || status !== 'signedIn' || !session?.approvedRoles.includes('admin')) {
      return;
    }

    let mounted = true;

    getDriverApplicationDetail(params.applicationId)
      .then((detail: DriverApplicationDetail) => {
        if (!mounted) {
          return;
        }

        setApplication(detail);
        setError(null);
        setIsLoading(false);
      })
      .catch((nextError: unknown) => {
        if (!mounted) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : 'Failed to load application.');
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params.applicationId, session, status]);

  const statusPalette = useMemo(() => {
  if (application?.status === 'approved') {
      return {
        background: '#DCFCE7',
        text: '#166534',
        label: 'Approved',
      };
  }

  if (application?.status === 'needs_resubmission') {
    return {
      background: '#FFEDD5',
      text: '#C2410C',
      label: 'Needs update',
    };
  }

  if (application?.status === 'rejected') {
      return {
        background: '#FEE2E2',
        text: '#B91C1C',
        label: 'Rejected',
      };
    }

    return {
      background: '#FEF3C7',
      text: '#B45309',
      label: 'Pending',
    };
  }, [application?.status]);

  // Review Decision Submit - writes the admin decision and required applicant note when needed.
  async function handleReview(statusValue: 'approved' | 'rejected' | 'needs_resubmission') {
    if (!application || !session) {
      return;
    }

    if ((statusValue === 'rejected' || statusValue === 'needs_resubmission') && !note.trim()) {
      Alert.alert('Add a review note', 'Include a short note so the applicant knows what to fix.');
      return;
    }

    setIsSubmitting(true);

    try {
      await reviewDriverApplication({
        applicationId: application.id,
        reviewerName: session.displayName,
        status: statusValue,
        note,
      });

      const nextStatusLabel = statusValue === 'approved'
        ? 'approved'
        : statusValue === 'needs_resubmission'
          ? 'marked for resubmission'
          : 'rejected';
      Alert.alert('Review saved', `The application was ${nextStatusLabel}.`);
      router.replace('/admin' as Href);
    } catch (nextError) {
      Alert.alert(
        'Action failed',
        nextError instanceof Error ? nextError.message : 'Could not update the application.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Pressable style={styles.backButton} onPress={() => router.replace('/admin' as Href)}>
              <Ionicons name="arrow-back" size={18} color={PRIMARY_DARK} />
            </Pressable>
            <View style={[styles.statusBadge, { backgroundColor: statusPalette.background }]}>
              <Text style={[styles.statusText, { color: statusPalette.text }]}>{statusPalette.label}</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Verify Driver Account</Text>
          <Text style={styles.headerBody}>
            Review the applicant details, then approve, reject, or send the application back for corrections.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.stateText}>Loading application…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn’t load this application</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        ) : null}

        {application ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Applicant</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{application.applicantName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{application.applicantEmail}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Submitted</Text>
                <Text style={styles.infoValue}>{formatLongDate(application.submittedAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Updated</Text>
                <Text style={styles.infoValue}>{formatLongDate(application.updatedAt)}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Vehicle and License</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue}>{application.vehicleType}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Plate</Text>
                <Text style={styles.infoValue}>{application.plateNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>License</Text>
                <Text style={styles.infoValue}>{application.licenseNumber}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Submitted ID</Text>
              {application.idImageUrl ? (
                <Image source={{ uri: application.idImageUrl }} style={styles.idImage} resizeMode="cover" />
              ) : (
                <View style={styles.imageFallback}>
                  <MaterialCommunityIcons name="image-off-outline" size={28} color={MUTED} />
                  <Text style={styles.imageFallbackText}>No preview available for this upload.</Text>
                </View>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Review Notes</Text>
              {application.reviewNotes.length > 0 ? (
                application.reviewNotes.map((entry, index) => (
                  <View key={`${application.id}-${index}`} style={styles.noteEntry}>
                    <Ionicons name="document-text-outline" size={16} color={PRIMARY_DARK} />
                    <Text style={styles.noteEntryText}>{entry}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyNotesText}>No review notes yet.</Text>
              )}

              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Add an optional review note"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.rejectButton, application.status !== 'pending' && styles.disabledButton]}
                onPress={() => handleReview('rejected')}
                disabled={isSubmitting || application.status !== 'pending'}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#991B1B" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#991B1B" />
                    <Text style={styles.rejectText}>Reject</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.resubmitButton, application.status !== 'pending' && styles.disabledButton]}
                onPress={() => handleReview('needs_resubmission')}
                disabled={isSubmitting || application.status !== 'pending'}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#9A3412" />
                ) : (
                  <>
                    <Ionicons name="refresh-circle-outline" size={18} color="#9A3412" />
                    <Text style={styles.resubmitText}>Request Update</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.approveButton, application.status !== 'pending' && styles.disabledButton]}
                onPress={() => handleReview('approved')}
                disabled={isSubmitting || application.status !== 'pending'}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.approveText}>Approve Driver</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FBF7',
  },
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FBF7',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  headerCard: {
    backgroundColor: '#ECFDF3',
    borderRadius: 28,
    padding: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#DFF7E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerTitle: {
    color: TEXT,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerBody: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
  },
  stateCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  stateText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 24,
    padding: 18,
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
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5F3EA',
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  infoValue: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  idImage: {
    width: '100%',
    aspectRatio: 1.58,
    borderRadius: 18,
    backgroundColor: '#D1D5DB',
  },
  imageFallback: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  imageFallbackText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  noteEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  noteEntryText: {
    flex: 1,
    color: '#374151',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyNotesText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  noteInput: {
    marginTop: 6,
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#F8FFFB',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  resubmitButton: {
    backgroundColor: '#FFEDD5',
  },
  approveButton: {
    backgroundColor: PRIMARY_DARK,
  },
  rejectText: {
    color: '#991B1B',
    fontSize: 15,
    fontWeight: '800',
  },
  resubmitText: {
    color: '#9A3412',
    fontSize: 15,
    fontWeight: '800',
  },
  approveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
