import { doc, getDoc, setDoc, type DocumentData } from 'firebase/firestore';

import { db } from '@/firebase';
import { normalizeApprovedRoles, normalizePendingRoles } from '@/lib/domain/auth';
import type { RegisterInput } from '@/services/contracts/auth';
import type { DriverApplicationDetail, DriverApplicationStatus } from '@/services/contracts/admin-review';
import { uploadDriverIdImage } from '@/services/media/cloudinary-upload';

interface FirestoreDriverApplicationRecord {
  uid?: unknown;
  requestedRole?: unknown;
  status?: unknown;
  submittedAt?: unknown;
  updatedAt?: unknown;
  documents?: {
    vehicleType?: unknown;
    plateNumber?: unknown;
    licenseNumber?: unknown;
    idImagePath?: unknown;
    idImageUrl?: unknown;
  } | unknown;
  reviewNotes?: unknown;
}

interface FirestoreUserProfile {
  displayName?: unknown;
  email?: unknown;
  approvedRoles?: unknown;
  pendingRoleRequests?: unknown;
}

interface DriverDocuments {
  vehicleType: string;
  plateNumber: string;
  licenseNumber: string;
  idImagePath: string | null;
  idImageUrl: string | null;
}

export interface SaveDriverApplicationInput {
  uid: string;
  applicationId: string;
  selectedVehicle: string;
  plateNumber: string;
  licenseNumber: string;
  idImageUri?: string | null;
}

// Driver Application Status Guard - validates review workflow states read from Firestore.
export function isDriverApplicationStatus(value: unknown): value is DriverApplicationStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'needs_resubmission';
}

// Review Notes Parser - keeps only non-empty review note strings from stored application data.
export function parseReviewNotes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((note): note is string => typeof note === 'string' && note.trim().length > 0);
}

// Latest Review Note - returns the newest admin note for status and applicant messaging.
export function getLatestReviewNote(reviewNotes: string[]) {
  return reviewNotes.length > 0 ? reviewNotes[reviewNotes.length - 1] : null;
}

// Applicant Review Message - extracts the human feedback portion of the latest review note.
export function getApplicantVisibleReviewNote(reviewNotes: string[]) {
  const latestReviewNote = getLatestReviewNote(reviewNotes);

  if (!latestReviewNote) {
    return null;
  }

  const segments = latestReviewNote.split('•').map((segment) => segment.trim()).filter(Boolean);

  if (segments.length >= 4) {
    return segments[segments.length - 1];
  }

  return latestReviewNote;
}

// Driver Documents Parser - normalizes vehicle and ID document fields from application data.
function getDriverDocuments(documents: FirestoreDriverApplicationRecord['documents']): DriverDocuments {
  const record = documents && typeof documents === 'object'
    ? documents as Record<string, unknown>
    : {};

  return {
    vehicleType: typeof record.vehicleType === 'string' ? record.vehicleType : 'Unknown vehicle',
    plateNumber: typeof record.plateNumber === 'string' ? record.plateNumber : 'Unknown plate',
    licenseNumber: typeof record.licenseNumber === 'string' ? record.licenseNumber : 'Unknown license',
    idImagePath: typeof record.idImagePath === 'string' ? record.idImagePath : null,
    idImageUrl: typeof record.idImageUrl === 'string' ? record.idImageUrl : null,
  };
}

// Driver Application Builder - joins application and user data into the admin/applicant detail model.
export async function buildDriverApplication(documentId: string, data: DocumentData): Promise<DriverApplicationDetail | null> {
  const application = data as FirestoreDriverApplicationRecord;

  if (
    typeof application.uid !== 'string'
    || application.requestedRole !== 'driver'
    || !isDriverApplicationStatus(application.status)
    || typeof application.submittedAt !== 'string'
    || typeof application.updatedAt !== 'string'
  ) {
    return null;
  }

  const userSnapshot = await getDoc(doc(db, 'users', application.uid));
  const userData = userSnapshot.exists()
    ? userSnapshot.data() as FirestoreUserProfile
    : {};
  const documents = getDriverDocuments(application.documents);

  return {
    id: documentId,
    uid: application.uid,
    applicantName: typeof userData.displayName === 'string' ? userData.displayName : 'Unknown user',
    applicantEmail: typeof userData.email === 'string' ? userData.email : 'No email found',
    status: application.status,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    vehicleType: documents.vehicleType,
    plateNumber: documents.plateNumber,
    licenseNumber: documents.licenseNumber,
    idImageUrl: documents.idImageUrl,
    approvedRoles: normalizeApprovedRoles(userData.approvedRoles),
    pendingRoleRequests: normalizePendingRoles(userData.pendingRoleRequests),
    reviewNotes: parseReviewNotes(application.reviewNotes),
  };
}

// Application Documents Builder - normalizes driver fields and uploads a replacement ID image when provided.
async function buildApplicationDocuments(uid: string, input: Pick<RegisterInput, 'selectedVehicle' | 'plateNumber' | 'licenseNumber' | 'idImageUri'>, existingDocuments?: DriverDocuments) {
  let idImagePath = existingDocuments?.idImagePath ?? null;
  let idImageUrl = existingDocuments?.idImageUrl ?? null;

  if (input.idImageUri) {
    const uploadedImage = await uploadDriverIdImage(uid, input.idImageUri);
    idImagePath = uploadedImage.idImagePath;
    idImageUrl = uploadedImage.idImageUrl;
  }

  return {
    vehicleType: input.selectedVehicle?.trim() ?? existingDocuments?.vehicleType ?? '',
    plateNumber: input.plateNumber?.trim().toUpperCase() ?? existingDocuments?.plateNumber ?? '',
    licenseNumber: input.licenseNumber?.trim().toUpperCase() ?? existingDocuments?.licenseNumber ?? '',
    idImagePath,
    idImageUrl,
  };
}

// Driver Application Creator - submits a pending driver role request for admin review.
export async function createDriverApplication(uid: string, input: RegisterInput) {
  const submittedAt = new Date().toISOString();
  const documents = await buildApplicationDocuments(uid, input);

  const applicationDoc = {
    uid,
    requestedRole: 'driver' as const,
    status: 'pending' as const,
    submittedAt,
    updatedAt: submittedAt,
    documents,
    reviewNotes: [] as string[],
  };

  await setDoc(doc(db, 'roleApplications', `driver_${uid}`), applicationDoc);
}

// Driver Application Detail Loader - fetches and validates one driver application by id.
export async function getDriverApplicationDetail(applicationId: string) {
  const applicationSnapshot = await getDoc(doc(db, 'roleApplications', applicationId));

  if (!applicationSnapshot.exists()) {
    throw new Error('We cannot find your driver application.');
  }

  const application = await buildDriverApplication(applicationSnapshot.id, applicationSnapshot.data());

  if (!application) {
    throw new Error('We could not read your driver application details.');
  }

  return application;
}

// Driver Application Resubmission - lets applicants edit pending or resubmission-required documents.
export async function saveDriverApplicationChanges(input: SaveDriverApplicationInput) {
  const applicationRef = doc(db, 'roleApplications', input.applicationId);
  const applicationSnapshot = await getDoc(applicationRef);

  if (!applicationSnapshot.exists()) {
    throw new Error('We cannot find your driver application.');
  }

  const existing = applicationSnapshot.data() as FirestoreDriverApplicationRecord;

  if (typeof existing.uid !== 'string' || existing.uid !== input.uid || existing.requestedRole !== 'driver') {
    throw new Error('We could not read your driver application details.');
  }

  if (existing.status !== 'pending' && existing.status !== 'needs_resubmission') {
    throw new Error('You cannot edit this application right now.');
  }

  const existingDocuments = getDriverDocuments(existing.documents);
  const nextDocuments = await buildApplicationDocuments(input.uid, {
    selectedVehicle: input.selectedVehicle,
    plateNumber: input.plateNumber,
    licenseNumber: input.licenseNumber,
    idImageUri: input.idImageUri,
  }, existingDocuments);

  if (!nextDocuments.idImageUrl || !nextDocuments.idImagePath) {
    throw new Error('Upload your ID before sending again.');
  }

  await setDoc(applicationRef, {
    uid: existing.uid,
    requestedRole: 'driver',
    status: 'pending',
    submittedAt: typeof existing.submittedAt === 'string' ? existing.submittedAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documents: nextDocuments,
    reviewNotes: parseReviewNotes(existing.reviewNotes),
  });
}
