import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * GET /api/stripe/connect/verify
 *
 * Called after Stripe redirects back from onboarding.
 * Checks if the contractor's Stripe Connect account is fully set up.
 * Updates contractor profile with verification status.
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
    if (!contractorSnap.exists) {
      return NextResponse.json(
        { error: "Contractor profile not found" },
        { status: 404 }
      );
    }

    const contractor = contractorSnap.data();
    const stripeConnectAccountId = contractor?.stripeConnectAccountId;

    if (!stripeConnectAccountId) {
      return NextResponse.json(
        { error: "No Stripe Connect account found" },
        { status: 400 }
      );
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(stripeConnectAccountId);

    // Check verification status
    // Full account means: charges_enabled = true (usually means all KYC complete)
    const isVerified =
      account.charges_enabled && account.payouts_enabled
        ? true
        : false;

    // Update contractor profile
    await adminDb.collection("contractors").doc(uid).update({
      stripeConnectOnboardingComplete: account.requirements?.current_deadline !== undefined ? false : true,
      stripeConnectVerified: isVerified,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      verified: isVerified,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
    });
  } catch (err: any) {
    console.error("stripe connect verify error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to verify Stripe Connect account" },
      { status: 500 }
    );
  }
}
