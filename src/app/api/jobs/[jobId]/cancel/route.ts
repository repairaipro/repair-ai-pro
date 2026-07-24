import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Cancellation rules:
 *
 * Homeowner can cancel:
 *   - triaged   → always (no contractor yet)
 *   - accepted  → full refund of held payment
 *
 * Contractor can cancel:
 *   - accepted  → full refund of held payment
 *
 * Neither can cancel once in_progress — must open a dispute instead.
 * Neither can cancel a disputed, confirmed, verified, or already cancelled job.
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid     = decoded.uid;
    const jobId   = params.jobId;

    const { reason } = await req.json();

    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = jobSnap.data()!;

    const isHomeowner  = job.userId === uid;
    const isContractor = job.claimedBy === uid;

    if (!isHomeowner && !isContractor) {
      return NextResponse.json({ error: "Not a participant on this job" }, { status: 403 });
    }

    const { status } = job;

    // Validate cancellation is allowed
    const homeownerCanCancel  = isHomeowner  && ["triaged", "accepted"].includes(status);
    const contractorCanCancel = isContractor && ["accepted"].includes(status);

    if (!homeownerCanCancel && !contractorCanCancel) {
      const msg =
        status === "in_progress"
          ? "Work has already started. Open a dispute instead."
          : status === "cancelled"
          ? "Job is already cancelled."
          : `Cannot cancel a job with status '${status}'.`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const cancelledByRole = isHomeowner ? "homeowner" : "contractor";
    const now = FieldValue.serverTimestamp();

    // Update job
    await jobRef.update({
      status:          "cancelled",
      cancelledAt:     now,
      cancelledBy:     uid,
      cancelledByRole,
      cancellationReason: String(reason ?? "").trim().slice(0, 500) || "No reason given",
      updatedAt:       now,
    });

    // Log event
    await jobRef.collection("events").add({
      type:            "job_cancelled",
      actorId:         uid,
      actorRole:       cancelledByRole,
      reason:          String(reason ?? "").trim().slice(0, 500),
      previousStatus:  status,
      createdAt:       now,
    });

    // Stripe refund if payment was held
    if (job.paymentIntentId && job.paymentStatus === "held") {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.paymentIntents.cancel(job.paymentIntentId);

        await jobRef.update({
          paymentStatus: "refunded",
          updatedAt:     now,
        });
      } catch (stripeErr) {
        // Non-fatal — log but don't block the cancellation
        console.error("Stripe cancel error (non-fatal):", stripeErr);
      }
    }

    // Notify the other party
    const recipientId = isHomeowner ? job.claimedBy : job.userId;
    if (recipientId) {
      const { notifyJobCancelled } = await import("@/lib/notif");
      notifyJobCancelled(recipientId, jobId, cancelledByRole).catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("cancel error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
