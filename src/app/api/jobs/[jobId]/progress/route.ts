import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyJobStarted, notifyJobCompleted, notifyJobConfirmed } from "@/lib/notif";

/**
 * Advances a job through its lifecycle.
 *
 * Contractor transitions (caller must be claimedBy):
 *   accepted     → in_progress
 *   in_progress  → completed
 *
 * Homeowner transition (caller must be userId):
 *   completed    → confirmed
 */

const CONTRACTOR_TRANSITIONS: Record<string, string> = {
  accepted:    "in_progress",
  in_progress: "completed",
};

const HOMEOWNER_TRANSITIONS: Record<string, string> = {
  completed: "confirmed",
};

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid     = decoded.uid;
    const jobId   = params.jobId;

    const { nextStatus } = await req.json();
    if (!nextStatus) {
      return NextResponse.json({ error: "Missing nextStatus" }, { status: 400 });
    }

    // ── Load job ──────────────────────────────────────────────────────────
    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job        = jobSnap.data()!;
    const currentStatus = job.status as string;

    // ── Determine who is allowed to make this move ────────────────────────
    const isContractor = job.claimedBy === uid;
    const isOwner      = job.userId === uid;

    const contractorNext = CONTRACTOR_TRANSITIONS[currentStatus];
    const homeownerNext  = HOMEOWNER_TRANSITIONS[currentStatus];

    let authorized = false;

    if (isContractor && contractorNext === nextStatus) authorized = true;
    if (isOwner      && homeownerNext  === nextStatus) authorized = true;

    if (!authorized) {
      return NextResponse.json(
        {
          error: isContractor || isOwner
            ? `Invalid transition from '${currentStatus}' to '${nextStatus}'`
            : "You are not a participant on this job",
        },
        { status: 403 }
      );
    }

    // ── Apply transition ──────────────────────────────────────────────────
    const now = FieldValue.serverTimestamp();

    const update: Record<string, unknown> = {
      status:    nextStatus,
      updatedAt: now,
    };

    if (nextStatus === "in_progress") update.startedAt   = now;
    if (nextStatus === "completed")   update.completedAt = now;
    if (nextStatus === "confirmed")   update.confirmedAt = now;

    await jobRef.update(update);

    // ── Audit event ───────────────────────────────────────────────────────
    await adminDb.collection("jobs").doc(jobId).collection("events").add({
      type:      "status_change",
      from:      currentStatus,
      to:        nextStatus,
      actorId:   uid,
      createdAt: now,
    });

    // Fire-and-forget notifications
    try {
      if (nextStatus === "in_progress") await notifyJobStarted(job.userId, jobId, job.description ?? "");
      if (nextStatus === "completed")   await notifyJobCompleted(job.userId, jobId);
      if (nextStatus === "confirmed")   await notifyJobConfirmed(job.claimedBy, jobId);
    } catch (e) {
      console.error("Notification error (non-fatal):", e);
    }

    // Release held payment on confirmation (fire-and-forget)
    if (nextStatus === "confirmed" && job.paymentIntentId && job.paymentStatus === "held") {
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
      fetch(`${base}/api/stripe/release`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ jobId }),
      }).catch((e) => console.error("Payment release error (non-fatal):", e));
    }

    return NextResponse.json({ success: true, from: currentStatus, to: nextStatus });
  } catch (err: any) {
    console.error("Progress route error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
