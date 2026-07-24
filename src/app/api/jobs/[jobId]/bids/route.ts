import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Auth: Bearer token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // 2. Load job doc
    const jobRef = adminDb.collection("jobs").doc(params.jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data()!;

    // Verify caller is either the homeowner or a valid contractor
    const isHomeowner = job.userId === uid;
    let isContractor = false;

    if (!isHomeowner) {
      const contractorSnap = await adminDb.collection("contractors").doc(uid).get();
      isContractor = contractorSnap.exists;
    }

    if (!isHomeowner && !isContractor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch all bid docs from subcollection
    const bidsSnap = await adminDb
      .collection("jobs")
      .doc(params.jobId)
      .collection("bids")
      .get();

    // 4. For each bid, fetch contractor profile
    const bidPromises = bidsSnap.docs.map(async (bidDoc) => {
      const bidData = bidDoc.data();
      const contractorId: string = bidData.contractorId;

      const contractorSnap = await adminDb
        .collection("contractors")
        .doc(contractorId)
        .get();

      const contractorProfile = contractorSnap.exists
        ? contractorSnap.data()!
        : {};

      return {
        // Bid fields
        contractorId: bidData.contractorId,
        amount: bidData.amount,
        message: bidData.message,
        etaDays: bidData.etaDays,
        submittedAt: bidData.submittedAt,
        status: bidData.status,
        // Contractor profile fields
        name: contractorProfile.name ?? null,
        trade: contractorProfile.trade ?? null,
        avgRating: contractorProfile.avgRating ?? null,
        reviewCount: contractorProfile.reviewCount ?? null,
        jobsCompleted: contractorProfile.jobsCompleted ?? null,
        photoUrl: contractorProfile.photoUrl ?? null,
        subscriptionPlan: contractorProfile.subscriptionPlan ?? null,
        trustScore: contractorProfile.trustScore ?? null,
      };
    });

    const bids = await Promise.all(bidPromises);

    // 5. Sort: Pro/Elite contractors first, then by amount asc
    const planOrder: Record<string, number> = { Elite: 0, Pro: 1 };

    bids.sort((a, b) => {
      const planA = planOrder[a.subscriptionPlan ?? ""] ?? 2;
      const planB = planOrder[b.subscriptionPlan ?? ""] ?? 2;
      if (planA !== planB) return planA - planB;
      return (a.amount ?? 0) - (b.amount ?? 0);
    });

    return NextResponse.json({ bids });
  } catch (err: any) {
    console.error("GET /bids error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch bids" },
      { status: 500 }
    );
  }
}
