import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendJobCompletedEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

/**
 * POST /api/jobs/[jobId]/complete
 * Contractor marks job as complete — homeowner must then confirm.
 */
export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded      = await adminAuth.verifyIdToken(token);
    const contractorId = decoded.uid;

    const jobId  = params.jobId;
    const jobRef = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data()!;

    // Verify caller is the assigned contractor
    if (job.claimedBy && job.claimedBy !== contractorId) {
      return NextResponse.json({ error: "Not your job" }, { status: 403 });
    }

    const body    = await req.json().catch(() => ({}));
    const summary = (body.summary ?? "") as string;

    // Update job status
    await jobRef.update({
      status:    "completed",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create completion record
    await jobRef.collection("completion").doc("record").set({
      completedBy:  contractorId,
      completedAt:  FieldValue.serverTimestamp(),
      summary:      summary.slice(0, 500),
      attachments:  body.attachments ?? [],
      status:       "pending_confirmation",
    }, { merge: true });

    // Timeline event
    await jobRef.collection("events").add({
      type:      "job_completed",
      actor:     contractorId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Email + SMS homeowner to confirm
    try {
      const contractorSnap = await adminDb.collection("contractors").doc(contractorId).get();
      const contractorName = (contractorSnap.data() as any)?.name ?? "Your contractor";

      const homeownerUser  = await adminAuth.getUser(job.userId);
      if (homeownerUser.email) {
        await sendJobCompletedEmail(homeownerUser.email, {
          contractorName,
          jobDescription: (job.description ?? "").slice(0, 80),
          jobId,
        });
      }

      await sendSMS(job.userId, {
        title: "✅ Job marked complete",
        body:  `${contractorName} says it's done. Confirm to release payment.`,
        link:  `/jobs/${jobId}`,
      });
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("complete error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
