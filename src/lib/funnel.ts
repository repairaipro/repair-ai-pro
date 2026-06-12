import { adminDb } from "@/lib/firebaseAdmin";

/**
 * SERVER-ONLY funnel instrumentation.
 *
 * One flat collection of timestamped events covering the marketplace funnel.
 * The metric that matters most: time from job_posted → first bid_submitted
 * (or job_claimed). Under 15 minutes, the marketplace lives.
 */
export type FunnelEvent =
  | "diagnosis_run"        // free tool used (top of funnel)
  | "job_posted"           // homeowner posted a job
  | "contractors_invited"  // invite wave sent
  | "bid_submitted"        // contractor responded with a bid
  | "job_claimed"          // contractor accepted/claimed
  | "job_completed"        // contractor marked done
  | "job_confirmed";       // homeowner confirmed (money moves)

/** Fire-and-forget — never blocks or throws into the caller */
export function trackEvent(
  type: FunnelEvent,
  meta: Record<string, any> = {}
): void {
  adminDb
    .collection("analyticsEvents")
    .add({ type, meta, at: new Date() })
    .catch((e) => console.error(`funnel(${type}) failed:`, e?.message));
}
