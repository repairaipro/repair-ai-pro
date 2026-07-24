import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/stripe/connect/create-account
 *
 * Creates or retrieves a Stripe Connect Express account for a contractor.
 * Generates an AccountLink with onboarding URL that redirects back to /onboarding/contractor/connect-return
 *
 * Contractor visits this endpoint, gets redirected to Stripe's hosted onboarding form.
 * After completing KYC, Stripe redirects back to the return URL with account setup.
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
        { error: "Contractor profile not found. Complete onboarding first." },
        { status: 404 }
      );
    }

    const contractor = contractorSnap.data();
    const stripeConnectAccountId = contractor?.stripeConnectAccountId;

    // If already has Connect account, just generate a fresh link
    if (stripeConnectAccountId) {
      const accountLink = await stripe.accountLinks.create({
        account: stripeConnectAccountId,
        type: "account_onboarding",
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://repair-ai-pro.vercel.app"}/api/stripe/connect/create-account?retry=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://repair-ai-pro.vercel.app"}/onboarding/contractor/connect-return`,
      });

      return NextResponse.json({ onboarding_url: accountLink.url });
    }

    // Create new Connect Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: contractor?.email || decoded.email,
      default_currency: "usd",
      metadata: {
        contractorUid: uid,
        contractorName: contractor?.name || "Unknown",
      },
    });

    // Save Connect account ID to contractor profile
    await adminDb.collection("contractors").doc(uid).update({
      stripeConnectAccountId: account.id,
      stripeConnectOnboardingComplete: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      type: "account_onboarding",
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://repair-ai-pro.vercel.app"}/api/stripe/connect/create-account?retry=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://repair-ai-pro.vercel.app"}/onboarding/contractor/connect-return`,
    });

    return NextResponse.json({
      onboarding_url: accountLink.url,
      connect_account_id: account.id,
    });
  } catch (err: any) {
    console.error("stripe connect create-account error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}
