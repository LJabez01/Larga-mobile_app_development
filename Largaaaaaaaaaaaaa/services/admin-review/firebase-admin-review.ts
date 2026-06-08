// Firebase Admin Review Service - loads and verifies driver applications for trusted admin accounts.
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/firebase';
import { normalizeApprovedRoles, normalizePendingRoles, type AppRole, type SelfServiceRole } from '@/lib/domain/auth';
import type {
  DriverApplicationDetail,
  DriverApplicationListItem,
  ReviewDriverApplicationInput,
} from '@/services/contracts/admin-review';
import {
  buildDriverApplication,
  getDriverApplicationDetail,
  isDriverApplicationStatus,
  parseReviewNotes,
} from '@/services/driver-applications/firebase-driver-applications';

interface FirestoreUserProfile {
  displayName?: unknown;
  email?: unknown;
  approvedRoles?: unknown;
  pendingRoleRequests?: unknown;
}

interface FirestoreDriverApplicationRecord {
  uid?: unknown;
  requestedRole?: unknown;
  status?: unknown;
  submittedAt?: unknown;
  updatedAt?: unknown;
  reviewNotes?: unknown;
}

// Driver Application Subscription - streams admin review rows and normalizes application documents.
export function subscribeToDriverApplications(
  listener: (applications: DriverApplicationListItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'roleApplications'),
    async (snapshot) => {
      try {
        const applications = await Promise.all(
          snapshot.docs.map((applicationDoc) => buildDriverApplication(applicationDoc.id, applicationDoc.data())),
        );

        listener(
          applications
            .filter((application): application is DriverApplicationDetail => Boolean(application))
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
        );
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Failed to load driver applications.'));
      }
    },
    (error) => {
      onError?.(error instanceof Error ? error : new Error('Failed to subscribe to driver applications.'));
    },
  );
}

// Review Note Builder - records reviewer, decision, timestamp, and optional feedback in one audit string.
function createReviewNote(status: ReviewDriverApplicationInput['status'], reviewerName: string, note?: string) {
  const timestamp = new Date().toISOString();
  const actionLabel = status === 'approved'
    ? 'APPROVED'
    : status === 'needs_resubmission'
      ? 'RESUBMISSION REQUESTED'
      : 'REJECTED';
  const trimmedNote = note?.trim();

  return trimmedNote
    ? `${timestamp} • ${actionLabel} • ${reviewerName} • ${trimmedNote}`
    : `${timestamp} • ${actionLabel} • ${reviewerName}`;
}

// Driver Approval Role Update - grants driver access and removes the pending driver request.
function applyApprovalToUser(
  approvedRoles: AppRole[],
  pendingRoleRequests: SelfServiceRole[],
) {
  const nextApprovedRoles = [...new Set<AppRole>([...approvedRoles, 'driver'])];
  const nextPendingRoles = pendingRoleRequests.filter((role) => role !== 'driver');

  return {
    approvedRoles: nextApprovedRoles,
    pendingRoleRequests: nextPendingRoles,
    primaryRole: approvedRoles.includes('commuter') ? 'commuter' : 'driver',
  };
}

// Driver Application Review - atomically updates the application and applicant role state.
export async function reviewDriverApplication(input: ReviewDriverApplicationInput) {
  if ((input.status === 'rejected' || input.status === 'needs_resubmission') && !input.note?.trim()) {
    throw new Error('A review note is required for rejected or resubmission decisions.');
  }

  const applicationRef = doc(db, 'roleApplications', input.applicationId);

  await runTransaction(db, async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);

    if (!applicationSnapshot.exists()) {
      throw new Error('Driver application not found.');
    }

    const applicationData = applicationSnapshot.data() as FirestoreDriverApplicationRecord;

    if (typeof applicationData.uid !== 'string' || applicationData.requestedRole !== 'driver') {
      throw new Error('Driver application is malformed.');
    }

    if (!isDriverApplicationStatus(applicationData.status) || applicationData.status !== 'pending') {
      throw new Error('Only pending driver applications can be reviewed.');
    }

    const userRef = doc(db, 'users', applicationData.uid);
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      throw new Error('Applicant profile not found.');
    }

    const userData = userSnapshot.data() as FirestoreUserProfile;
    const approvedRoles = normalizeApprovedRoles(userData.approvedRoles);
    const pendingRoleRequests = normalizePendingRoles(userData.pendingRoleRequests);
    const nextReviewNotes = [
      ...parseReviewNotes(applicationData.reviewNotes),
      createReviewNote(input.status, input.reviewerName, input.note),
    ];
    const updatedAt = new Date().toISOString();

    transaction.update(applicationRef, {
      status: input.status,
      updatedAt,
      reviewNotes: nextReviewNotes,
    });

    if (input.status === 'approved') {
      const nextRoleState = applyApprovalToUser(approvedRoles, pendingRoleRequests);

      transaction.update(userRef, {
        approvedRoles: nextRoleState.approvedRoles,
        pendingRoleRequests: nextRoleState.pendingRoleRequests,
        primaryRole: nextRoleState.primaryRole,
        updatedAt,
      });

      return;
    }

    transaction.update(userRef, {
      updatedAt,
    });
  });
}
