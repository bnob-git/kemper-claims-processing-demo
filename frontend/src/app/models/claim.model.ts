export interface Policy {
  id: number;
  policyNumber: string;
  holderName: string;
  holderEmail: string;
  vehicleVin: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  coverageType: string;
  effectiveDate: string;
  expirationDate: string;
}

export interface Claim {
  id: number;
  claimNumber: string;
  policy: Policy;
  status: string;
  lossType: string;
  severityScore: number;
  lossDate: string;
  lossDescription: string;
  reportedDate: string;
  claimantName: string;
  claimantPhone: string;
  reserveAmount: number | null;
  settlementAmount: number | null;
  subrogationFlag: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimEvent {
  id: number;
  claimId: number;
  eventType: string;
  oldStatus: string | null;
  newStatus: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface Assignment {
  id: number;
  claimId: number;
  adjusterId: number;
  assignedDate: string;
  assignmentType: string;
  notes: string;
  adjuster: AppUser;
}

export interface AppUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  email: string;
}

export interface DocumentMetadata {
  id: number;
  claimId: number;
  fileName: string;
  documentType: string;
  uploadedBy: string;
  uploadedAt: string;
  notes: string;
}

export interface Payment {
  id: number;
  claimId: number;
  amount: number;
  paymentType: string;
  paymentDate: string;
  referenceNumber: string;
  status: string;
  createdBy: string;
}

export interface NotificationLog {
  id: number;
  claimId: number;
  recipientEmail: string;
  eventType: string;
  sentAt: string;
  message: string;
}
