import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendSMS } from "@/lib/sms";
import { createNotification } from "@/lib/notif";
import { trackEvent } from "@/lib/funnel";

/**
 * POST /api/jobs/[jobId]/bid
 * Contractor submits a bid on an open or triaged job.
 *
 * Body: { amount: number, message: string, etaDays?: number }
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    /* ---------------- AUTH ---------------- */
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid     = decoded.uid;
    const jobId   = params.jobId;

    /* ---------------- PARSE BODY ---------------- */
    let body: { amount?: number; message?: string; etaDays?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { amount, message, etaDays } = body;

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    /* ---------------- LOAD JOB ---------------- */
    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data()!;

    if (job.status !== "open" && job.status !== "triaged") {
      return NextResponse.json(
        { error: `Job is not accepting bids (current status: '${job.status}')` },
        { status: 409 }
      );
    }

    /* ---------------- SAVE BID ---------------- */
    const bidData = {
      contractorId: uid,
      amount,
      message:      message.trim(),
      etaDays:      etaDays ?? 3,
      submittedAt:  FieldValue.serverTimestamp(),
      status:       "pending",
    };

    await jobRef.collection("bids").doc(uid).set(bidData);

    trackEvent("bid_submitted", { jobId, contractorId: uid, amount });

    /* ---------------- INCREMENT BID COUNT ---------------- */
    await jobRef.update({
      bidCount:  FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    /* ---------------- NOTIFY + SMS HOMEOWNER ---------------- */
    try {
      const trade = job.aiDetectedTrade ?? job.trade ?? "repair";

      // Get contractor name for richer notification
      const contractorSnap = await adminDb.collection("contractors").doc(uid).get();
      const contractorName = (contractorSnap.data() as any)?.name ?? "A contractor";

      await Promise.all([
        createNotification({
          recipientId: job.userId,
          type:        "new_bid" as any,
          title:       `New bid — $${amount}`,
          body:        `${contractorName} bid $${amount} on your ${trade} job. Tap to compare bids.`,
          jobId,
          href:        `/jobs/${jobId}`,
        }),
        sendSMS(job.userId, {
          title: "🎯 New bid received",
          body:  `${contractorName} bid $${amount} on your ${trade} job. View all bids.`,
          link:  `/jobs/${jobId}`,
        }),
      ]);
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      bid: {
        contractorId: uid,
        amount,
        message: message.trim(),
      },
    });
  } catch (err: any) {
    console.error("bid route error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
