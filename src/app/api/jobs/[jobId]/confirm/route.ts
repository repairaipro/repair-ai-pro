import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Homeowner confirms the job is done.
 * Equivalent to calling /progress with nextStatus=confirmed —
 * this endpoint exists as a convenience alias used by older components.
 */
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

    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data()!;

    if (job.userId !== uid) {
      return NextResponse.json({ error: "Only the job owner can confirm completion" }, { status: 403 });
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        { error: `Job must be 'completed' before confirming (current: '${job.status}')` },
        { status: 400 }
      );
    }

    const now = FieldValue.serverTimestamp();

    await adminDb.runTransaction(async (tx) => {
      tx.update(jobRef, {
        status:      "confirmed",
        confirmedAt: now,
        updatedAt:   now,
      });

      // Update or create completion record
      const completionRef = adminDb
        .collection("jobs").doc(jobId)
        .collection("completion").doc("record");

      tx.set(completionRef, {
        confirmedBy:    uid,
        confirmationAt: now,
        status:         "confirmed",
      }, { merge: true });

      // Audit event
      const eventRef = adminDb.collection("jobs").doc(jobId).collection("events").doc();
      tx.set(eventRef, {
        type:      "job_confirmed",
        actorId:   uid,
        createdAt: now,
      });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Confirm route error:", e);
    return NextResponse.json({ error: e.message ?? "Failed to confirm job" }, { status: 500 });
  }
}
