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

export type JobMessage = {
  id: string;
  text: string;
  senderId?: string;
  kind: "user" | "contractor" | "system" | "ai";
  createdAt: Timestamp;
};
