import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const ADMIN_UIDS = (process.env.ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

async function isAdmin(req: Request): Promise<boolean> {
  try {
    const header  = req.headers.get("authorization") ?? "";
    const token   = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return false;
    const decoded = await adminAuth.verifyIdToken(token);
    return ADMIN_UIDS.includes(decoded.uid) || (decoded.email?.endsWith("@repair-ai.admin") ?? false);
  } catch { return false; }
}

/**
 * Resolves a dispute with one of four outcomes:
 *
 * contractor_fault → refund homeowner, mark job cancelled
 * owner_fault      → release payment to contractor, mark job confirmed
 * mutual           → 50/50 or custom handling — mark disputed, notify both
 * invalid          → dismiss dispute, restore previous status
 */
export async function POST(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { jobId, disputeId, resolution, adminNote } = await req.json();

    if (!jobId || !disputeId || !resolution) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validResolutions = ["contractor_fault", "owner_fault", "mutual", "invalid"];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
    }

    const jobRef     = adminDb.collection("jobs").doc(jobId);
    const disputeRef = jobRef.collection("disputes").doc(disputeId);

    const [jobSnap, disputeSnap] = await Promise.all([jobRef.get(), disputeRef.get()]);
    if (!jobSnap.exists)     return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!disputeSnap.exists) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

    const job = jobSnap.data()!;
    const now = FieldValue.serverTimestamp();

    // Resolve the dispute doc
    await disputeRef.update({
      status:     "resolved",
      resolution,
      adminNote:  adminNote?.trim() ?? "",
      resolvedAt: now,
    });

    // Apply outcome to the job
    let newJobStatus = "disputed";
    let paymentAction: "capture" | "cancel" | "none" = "none";

    if (resolution === "contractor_fault") {
      newJobStatus  = "cancelled";
      paymentAction = "cancel"; // full refund
    } else if (resolution === "owner_fault") {
      newJobStatus  = "confirmed";
      paymentAction = "capture"; // release to contractor
    } else if (resolution === "invalid") {
      newJobStatus = "in_progress"; // restore to before dispute
    }
    // "mutual" stays disputed for manual handling

    await jobRef.update({
      status:         newJobStatus,
      disputeResolution: resolution,
      disputeResolvedAt: now,
      updatedAt:      now,
    });

    // Handle payment
    if (job.paymentIntentId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        if (paymentAction === "cancel") {
          await stripe.paymentIntents.cancel(job.paymentIntentId);
          await jobRef.update({ paymentStatus: "refunded", updatedAt: now });
        } else if (paymentAction === "capture") {
          await stripe.paymentIntents.capture(job.paymentIntentId);
          await jobRef.update({ paymentStatus: "released", updatedAt: now });
        }
      } catch (stripeErr) {
        console.error("Stripe action error (non-fatal):", stripeErr);
      }
    }

    // Log event
    await jobRef.collection("events").add({
      type:       "dispute_resolved",
      resolution,
      adminNote:  adminNote?.trim() ?? "",
      createdAt:  now,
    });

    // Notify both parties
    const { createNotification } = await import("@/lib/notif");
    const recipients = [job.userId, job.claimedBy].filter(Boolean) as string[];
    const resolutionLabel: Record<string, string> = {
      contractor_fault: "ruled in your favor — full refund issued",
      owner_fault:      "ruled in the contractor's favor — payment released",
      mutual:           "marked as mutual — manual review in progress",
      invalid:          "dismissed — job continues as normal",
    };
    const body = `Dispute ${resolutionLabel[resolution] ?? "resolved"}.${adminNote ? ` Admin note: ${adminNote}` : ""}`;

    await Promise.all(
      recipients.map((uid) =>
        createNotification({
          recipientId: uid,
          type:        "dispute_resolved" as any,
          title:       "Your dispute has been resolved",
          body,
          jobId,
          href:        `/chat?job=${jobId}`,
        })
      )
    );

    return NextResponse.json({ ok: true, newJobStatus });
  } catch (err: any) {
    console.error("resolve-dispute error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
