import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/stripe/contractor-subscribe
 * Body: { plan: "pro" | "elite" }
 *
 * Creates a Stripe Checkout Session for contractor subscription.
 * Saves stripeCustomerId on the contractor document.
 * Redirects to Stripe-hosted checkout.
 */

const PLANS = {
  pro: {
    name:       "RepairAI Pro",
    amount:     2900,   // $29.00/month in cents
    interval:   "month" as const,
    features:   "Unlimited job invites · Verified Pro badge · Priority matching · AI job scoring · SMS + push alerts",
    envPriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  elite: {
    name:       "RepairAI Elite",
    amount:     7900,   // $79.00/month in cents
    interval:   "month" as const,
    features:   "Everything in Pro · Featured placement · Dedicated account manager · Early emergency access · 0% fee on first 3 jobs/month",
    envPriceId: process.env.STRIPE_ELITE_PRICE_ID,
  },
} as const;

export async function POST(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid     = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const plan = (body.plan ?? "pro") as "pro" | "elite";

    if (!PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planConfig = PLANS[plan];

    // Fetch contractor to get/set Stripe customer ID
    const contractorRef  = adminDb.collection("contractors").doc(uid);
    const contractorSnap = await contractorRef.get();
    const contractor     = contractorSnap.data() ?? {};

    // Fetch user email from Firebase Auth
    const authUser = await adminAuth.getUser(uid);
    const email    = authUser.email ?? contractor.email ?? undefined;

    // Get or create Stripe Customer
    let customerId: string = contractor.stripeCustomerId ?? "";

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name:     contractor.name ?? authUser.displayName ?? undefined,
        metadata: { uid, role: "contractor" },
      });
      customerId = customer.id;

      // Save immediately so we don't create duplicate customers
      await contractorRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    // Resolve price ID (use env var if set, otherwise create dynamically)
    let priceId = planConfig.envPriceId ?? "";

    if (!priceId) {
      // Create product + price on-the-fly (idempotent via lookup_key)
      const lookupKey = `contractor_${plan}_monthly`;

      const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
      if (existing.data.length > 0) {
        priceId = existing.data[0].id;
      } else {
        // Create the product
        const product = await stripe.products.create({
          name:        planConfig.name,
          description: planConfig.features,
          metadata:    { plan, role: "contractor" },
        });

        // Create the price with a lookup key for future retrieval
        const price = await stripe.prices.create({
          product:     product.id,
          unit_amount: planConfig.amount,
          currency:    "usd",
          recurring:   { interval: planConfig.interval },
          lookup_key:  lookupKey,
          metadata:    { plan, role: "contractor" },
        });

        priceId = price.id;
      }
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode:       "subscription",
      customer:   customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/onboarding/contractor/subscription-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url:  `${origin}/contractor/pro`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: {
        metadata: { uid, plan, role: "contractor" },
        trial_period_days: plan === "pro" ? 7 : undefined, // 7-day free trial for Pro
      },
      metadata: { uid, plan, role: "contractor" },
    });

    // Save pending subscription intent on contractor doc
    await contractorRef.set({
      pendingSubscriptionPlan: plan,
      pendingCheckoutSessionId: session.id,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ checkout_url: session.url });
  } catch (err: any) {
    console.error("contractor-subscribe error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * GET /api/stripe/contractor-subscribe?plan=pro
 * Legacy support: called directly from <Link href="..."> — redirect to checkout
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan") ?? "pro";
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Redirect to pro page with a hash so JS can open checkout
  return NextResponse.redirect(`${origin}/contractor/pro?checkout=${plan}`, 302);
}
