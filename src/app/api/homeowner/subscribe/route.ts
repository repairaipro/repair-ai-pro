import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/homeowner/subscribe
 * Body: { plan: "pro" }
 *
 * Creates a Stripe Checkout Session for homeowner Pro subscription ($19/mo).
 * Saves stripeCustomerId on the homeowner document.
 * Returns { checkout_url } for client-side redirect.
 */

const HOMEOWNER_PLANS = {
  pro: {
    name:       "RepairAI Pro Homeowner",
    amount:     1900,   // $19.00/month in cents
    interval:   "month" as const,
    features:   "Priority contractor matching · Home Health Score · Annual repair summary · 30-day warranty · 5% cash back · AI cost estimates",
    lookupKey:  "homeowner_pro_monthly",
    trialDays:  14,
  },
} as const;

type HomeownerPlan = keyof typeof HOMEOWNER_PLANS;

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Verify Bearer token
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid     = decoded.uid;

    // Parse body
    const body = await req.json().catch(() => ({}));
    const plan  = (body.plan ?? "pro") as HomeownerPlan;

    if (!HOMEOWNER_PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan. Only 'pro' is supported." }, { status: 400 });
    }

    const planConfig = HOMEOWNER_PLANS[plan];

    // Fetch homeowner doc to get/set Stripe customer ID
    const homeownerRef  = adminDb.collection("homeowners").doc(uid);
    const homeownerSnap = await homeownerRef.get();
    const homeowner     = homeownerSnap.data() ?? {};

    // Fetch user email from Firebase Auth
    const authUser = await adminAuth.getUser(uid);
    const email    = authUser.email ?? homeowner.email ?? undefined;

    // Get or create Stripe Customer
    let customerId: string = homeowner.stripeCustomerId ?? "";

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name:     homeowner.name ?? authUser.displayName ?? undefined,
        metadata: { uid, role: "homeowner" },
      });
      customerId = customer.id;

      // Save immediately to prevent duplicate customers on concurrent requests
      await homeownerRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    // Resolve price ID via lookup_key (idempotent — creates once, reuses after)
    let priceId = "";

    const existing = await stripe.prices.list({
      lookup_keys: [planConfig.lookupKey],
      limit: 1,
    });

    if (existing.data.length > 0) {
      priceId = existing.data[0].id;
    } else {
      // Create product + price on first run
      const product = await stripe.products.create({
        name:        planConfig.name,
        description: planConfig.features,
        metadata:    { plan, role: "homeowner" },
      });

      const price = await stripe.prices.create({
        product:     product.id,
        unit_amount: planConfig.amount,
        currency:    "usd",
        recurring:   { interval: planConfig.interval },
        lookup_key:  planConfig.lookupKey,
        metadata:    { plan, role: "homeowner" },
      });

      priceId = price.id;
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode:       "subscription",
      customer:   customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/onboarding/homeowner/subscription-success?plan=${plan}`,
      cancel_url:  `${origin}/dashboard`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: {
        trial_period_days: planConfig.trialDays,
        metadata: { uid, plan, role: "homeowner" },
      },
      metadata: { uid, plan, role: "homeowner" },
    });

    // Record pending intent on homeowner doc
    await homeownerRef.set({
      pendingSubscriptionPlan:      plan,
      pendingCheckoutSessionId:     session.id,
      updatedAt:                    FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ checkout_url: session.url });
  } catch (err: any) {
    console.error("homeowner-subscribe error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}

// Webhook helper moved to src/lib/homeownerSubscription.ts
