import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const contractorId = decoded.uid;

    // 🚨 PHASE 3: Check if contractor has verified Stripe Connect account
    const contractorSnap = await adminDb.collection("contractors").doc(contractorId).get();
    if (!contractorSnap.exists) {
      return NextResponse.json(
        {
          error: "Complete your contractor profile first",
          code: "NO_PROFILE",
        },
        { status: 403 }
      );
    }

    const contractor = contractorSnap.data();
    if (contractor?.stripeConnectVerified !== true) {
      return NextResponse.json(
        {
          error: "Complete bank verification to accept jobs",
          code: "UNVERIFIED_STRIPE",
          onboardingUrl: `/api/stripe/connect/create-account`,
        },
        { status: 403 }
      );
    }

    const jobRef = adminDb.collection("jobs").doc(params.jobId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(jobRef);

      if (!snap.exists) {
        throw new Error("Job not found");
      }

      const job = snap.data();

      // 🚫 Already claimed
      if (job?.claimedBy) {
        throw new Error("Job already claimed");
      }

      tx.update(jobRef, {
        claimedBy: contractorId,
        status: "claimed",
        claimedAt: new Date(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to claim job" },
      { status: 400 }
    );
  }
}
