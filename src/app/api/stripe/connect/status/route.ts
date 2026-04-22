import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/**
 * GET /api/stripe/connect/status
 *
 * Check if a contractor has a verified Stripe Connect account.
 * Returns: { verified: boolean, onboardingUrl?: string }
 */
export async function GET(req: Request) {
  try {
    // Auth check
    const header = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Fetch contractor profile
    const contractorSnap = await adminDb.collection("contractors").doc(uid).get();
    if (!contractorSnap.exists()) {
      return NextResponse.json(
        {
          verified: false,
          message: "Contractor profile not found",
        },
        { status: 404 }
      );
    }

    const contractor = contractorSnap.data();
    const isVerified = contractor?.stripeConnectVerified === true;

    return NextResponse.json({
      verified: isVerified,
      accountId: contractor?.stripeConnectAccountId || null,
      onboardingComplete: contractor?.stripeConnectOnboardingComplete || false,
    });
  } catch (err: any) {
    console.error("stripe connect status error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to check status" },
      { status: 500 }
    );
  }
}
