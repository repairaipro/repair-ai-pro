import { Timestamp } from "firebase/firestore";

/**
 * Canonical job status type — single source of truth for the entire app.
 *
 * Lifecycle (normal flow):
 *   draft → triaged → matched → accepted → in_progress → completed → confirmed
 *
 * Legacy / alternative states still present in Firestore:
 *   open, claimed (older contractor-claim flow)
 *
 * Extended workflow states (orchestrator / inspection flow):
 *   contacted → inspection_scheduled → quote_proposed → approved → verified
 *
 * Terminal states:
 *   closed, cancelled
 */
export type JobStatus =
  // Core lifecycle
  | "draft"
  | "triaged"
  | "matched"
  | "accepted"
  | "in_progress"
  | "completed"
  | "confirmed"
  // Legacy / alternative claim flow
  | "open"
  | "claimed"
  // Extended inspection / quote flow
  | "contacted"
  | "inspection_scheduled"
  | "quote_proposed"
  | "approved"
  | "verified"
  // Terminal
  | "closed"
  | "cancelled";

export type PaymentStatus = "pending" | "held" | "released" | "refunded" | "failed";
export type PayoutStatus = "pending" | "transferred" | "failed";

export type Job = {
  id: string;
  userId: string;

  description: string;
  location: string;
  trade?: string;

  status: JobStatus;

  claimedBy?: string;

  aiSummary?: string;
  aiDetectedTrade?: string;
  aiSeverity?: "low" | "medium" | "high";

  // PHASE 2: Payment / Escrow
  paymentIntentId?: string;
  paymentStatus?: PaymentStatus;
  paymentHeldAt?: Timestamp;
  paymentReleasedAt?: Timestamp;

  // PHASE 4/5: Payout to contractor
  payoutTransferId?: string;
  payoutAmount?: number;
  payoutStatus?: PayoutStatus;
  payoutAt?: Timestamp;
  payoutFailureCode?: string;
  payoutFailureMessage?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type MilestoneStatus =
  | 'pending'       // not yet started
  | 'in_progress'   // contractor marked as working
  | 'awaiting_approval' // contractor marked complete, waiting homeowner
  | 'approved'      // homeowner approved, payout released
  | 'disputed'      // homeowner rejected
  | 'released';     // transfer sent to contractor

export type Milestone = {
  id: string;
  jobId: string;
  title: string;
  description: string;
  percentage: number;       // 0-100, must sum to 100 across all milestones
  amount: number;           // USD
  order: number;            // display/release order (1-based)
  status: MilestoneStatus;
  completedAt?: Timestamp;
  approvedAt?: Timestamp;
  disputedAt?: Timestamp;
  stripeTransferId?: string;
  payoutAmount?: number;    // after platform fee
  contractorNotes?: string;
  homeownerNotes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type JobMessage = {
  id: string;
  text: string;
  senderId?: string;
  kind: "user" | "contractor" | "system" | "ai";
  createdAt: Timestamp;
};

// PHASE 1: Contractor Specializations
export type Specialization = {
  id: string;
  trade: string; // plumbing, electrical, HVAC, etc.
  specialty: string; // water heater repair, circuit breaker installation, etc.
  completedJobs: number;
  successRate: number; // % jobs rated 4+ stars
  averageRating: number; // avg rating for this specialty
  totalHoursWorked?: number;
  verified: boolean; // auto-set after 10+ jobs with 90%+ 4+ star reviews
  certifications?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

// PHASE 1: Contractor Quality Score
export type QualityScore = {
  overallScore: number; // 0-100
  responseTime: number; // avg hours to respond to invite
  timeAccuracy: number; // % jobs completed within estimated time
  photoEvidenceScore: number; // % jobs with 3+ photos
  disputeRate: number; // % jobs with disputes
  specializations: {
    count: number; // verified specialties
    avgRatingPerSpecialty: number;
  };
  jobCompletionRate: number; // % invites → completed jobs
  weights: {
    rating: number;
    responseTime: number;
    timeAccuracy: number;
    photoEvidenceScore: number;
    disputeRate: number;
    specializations: number;
  };
  lastUpdated?: Timestamp;
};

// PHASE 1: Work Photos (Evidence)
export type WorkPhoto = {
  id: string;
  url: string; // Cloudinary URL
  uploadedBy: string; // contractor userId
  uploadedAt: Timestamp;
  caption?: string;
  stage: "diagnosis" | "in-progress" | "completed"; // when was photo taken
  verified: boolean;
  aiCategory?: string; // auto-detected category
  thumbnailUrl?: string;
  metadata: {
    width: number;
    height: number;
    size: number; // bytes
  };
};

// PHASE 1: Job Completion Record
export type JobCompletion = {
  completedBy: string; // contractor userId
  completedAt: Timestamp;
  photos: string[]; // photoIds of final state
  summary?: string;
  signoffPhotos?: string[]; // homeowner comparison photos if dispute
};
