import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Opens a dispute on a job.
 * - Sets job.status → "disputed"
 * - Creates a dispute doc with reason, category, and reporter
 * - Notifies both the homeowner and contractor via in-app + email
 * - Payment stays frozen (held but not captured) until admin resolves
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

    const { category, description } = await req.json();

    if (!category || !description?.trim()) {
      return NextResponse.json({ error: "Category and description are required" }, { status: 400 });
    }

    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = jobSnap.data()!;

    // Must be a participant
    const isHomeowner  = job.userId === uid;
    const isContractor = job.claimedBy === uid;
    if (!isHomeowner && !isContractor) {
      return NextResponse.json({ error: "Not a participant on this job" }, { status: 403 });
    }

    // Only disputable in these states
    const disputableStatuses = ["accepted", "in_progress", "completed"];
    if (!disputableStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot dispute a job with status '${job.status}'` },
        { status: 400 }
      );
    }

    // Already disputed?
    if (job.status === "disputed") {
      return NextResponse.json({ error: "Job is already disputed" }, { status: 400 });
    }

    const reporterRole = isHomeowner ? "homeowner" : "contractor";
    const now = FieldValue.serverTimestamp();

    // Update job status
    await jobRef.update({
      status:      "disputed",
      disputedAt:  now,
      disputedBy:  uid,
      updatedAt:   now,
    });

    // Create dispute record
    const disputeRef = await jobRef.collection("disputes").add({
      reporterId:   uid,
      reporterRole,
      category,
      description:  description.trim().slice(0, 2000),
      status:       "open",
      createdAt:    now,
    });

    // Log timeline event
    await jobRef.collection("events").add({
      type:        "dispute_opened",
      actorId:     uid,
      actorRole:   reporterRole,
      category,
      disputeId:   disputeRef.id,
      createdAt:   now,
    });

    // Notify both parties (fire-and-forget)
    const { notifyDisputeOpened } = await import("@/lib/notif");
    notifyDisputeOpened(
      job.userId,
      job.claimedBy,
      uid,
      jobId,
      category
    ).catch(console.error);

    return NextResponse.json({ ok: true, disputeId: disputeRef.id });
  } catch (err: any) {
    console.error("dispute error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
