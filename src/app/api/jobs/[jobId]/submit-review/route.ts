import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyReviewReceived } from "@/lib/notif";

type Body = {
  contractorId: string;
  rating: number;     // 1-5
  text: string;
};

export async function POST(req: Request, ctx: { params: { jobId: string } }) {
  try {
    const jobId = ctx.params.jobId;

    // Identity comes from the verified token — never from the request body
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const reviewerId = decoded.uid;

    const body = (await req.json()) as Body;

    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    if (!body?.contractorId) {
      return NextResponse.json({ error: "Missing contractorId" }, { status: 400 });
    }

    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const text = String(body.text ?? "").trim().slice(0, 1000);

    // 1) Validate job
    const jobRef = adminDb.doc(`jobs/${jobId}`);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = jobSnap.data() as any;

    // Must be confirmed or verified
    if (!["confirmed", "verified"].includes(job.status)) {
      return NextResponse.json(
        { error: "Job must be confirmed before leaving a review" },
        { status: 400 }
      );
    }

    // reviewer must be job owner
    if (job.userId !== reviewerId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // contractor must match claimedBy
    if (!job.claimedBy || job.claimedBy !== body.contractorId) {
      return NextResponse.json({ error: "Contractor mismatch" }, { status: 400 });
    }

    // 2) Enforce 1 review per job per reviewer
    const jobReviewsRef = adminDb.collection(`jobs/${jobId}/reviews`);
    const existing = await jobReviewsRef
      .where("reviewerId", "==", reviewerId)
      .limit(1)
      .get();
    if (!existing.empty) {
      return NextResponse.json({ error: "Review already submitted" }, { status: 400 });
    }

    // 3) Write review in both places + update aggregates in a transaction
    await adminDb.runTransaction(async (tx) => {
      const contractorRef = adminDb.doc(`contractors/${body.contractorId}`);
      const contractorSnap = await tx.get(contractorRef);
      if (!contractorSnap.exists) throw new Error("Contractor not found");

      const contractor = contractorSnap.data() as any;
      const prevCount = Number(contractor.reviewCount ?? 0);
      const prevAvg = Number(contractor.avgRating ?? 0);

      const newCount = prevCount + 1;
      const newAvg = Math.round(((prevAvg * prevCount + rating) / newCount) * 10) / 10;

      const reviewPayload = {
        jobId,
        contractorId: body.contractorId,
        reviewerId: reviewerId,
        rating,
        text,
        createdAt: FieldValue.serverTimestamp(),
      };

      const jobReviewDoc = jobReviewsRef.doc();
      tx.set(jobReviewDoc, reviewPayload);

      const contractorReviewRef = adminDb.doc(
        `contractors/${body.contractorId}/reviews/${jobReviewDoc.id}`
      );
      tx.set(contractorReviewRef, reviewPayload);

      tx.update(contractorRef, {
        reviewCount: newCount,
        avgRating: newAvg,
        lastReviewAt: FieldValue.serverTimestamp(),
      });

      // log event into job timeline
      const evRef = adminDb.collection(`jobs/${jobId}/events`).doc();
      tx.set(evRef, {
        type: "review_submitted",
        actorId: reviewerId,
        contractorId: body.contractorId,
        rating,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    // Notify contractor of new review (fire-and-forget)
    notifyReviewReceived(body.contractorId, jobId, rating).catch(console.error);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
