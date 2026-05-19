// Admin Review Contracts - shared types for the in-app driver verification workflow.
export type DriverApplicationStatus = 'pending' | 'approved' | 'rejected' | 'needs_resubmission';

export interface DriverApplicationListItem {
  id: string;
  uid: string;
  applicantName: string;
  applicantEmail: string;
  status: DriverApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  vehicleType: string;
  plateNumber: string;
  licenseNumber: string;
  idImageUrl: string | null;
  approvedRoles: string[];
  pendingRoleRequests: string[];
}

export interface DriverApplicationDetail extends DriverApplicationListItem {
  reviewNotes: string[];
}

export interface ReviewDriverApplicationInput {
  applicationId: string;
  reviewerName: string;
  status: Extract<DriverApplicationStatus, 'approved' | 'rejected' | 'needs_resubmission'>;
  note?: string;
}
