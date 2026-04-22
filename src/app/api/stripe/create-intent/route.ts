import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Creates a Stripe PaymentIntent for a job.
 * Called by the homeowner when they're ready to secure payment.
 * Funds are captured but not transferred until job is confirmed.
 */
export async function POST(req: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid     = decoded.uid;

    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    // ── Load job ──────────────────────────────────────────────────────────
    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = jobSnap.data()!;

    // Only the homeowner can pay
    if (job.userId !== uid) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Job must be accepted before payment
    if (!["accepted", "in_progress"].includes(job.status)) {
      return NextResponse.json({ error: "Job must be accepted before payment" }, { status: 400 });
    }

    // Don't create duplicate intents
    if (job.paymentStatus === "held" || job.paymentStatus === "released") {
      return NextResponse.json({ error: "Payment already completed" }, { status: 400 });
    }

    // ── Determine amount ──────────────────────────────────────────────────
    // Use job's typical estimate, fall back to $100 minimum
    const estimatedUsd =
      job.estimatedCost?.typical ??
      job.estimate?.price_typical_usd ??
      100;

    const amountCents = Math.max(Math.round(Number(estimatedUsd) * 100), 5000); // min $50

    // ── Get or create Stripe customer ─────────────────────────────────────
    let customerId: string = job.stripeCustomerId ?? "";

    if (!customerId) {
      const userRecord = await adminAuth.getUser(uid);
      const customer = await stripe.customers.create({
        email: userRecord.email ?? undefined,
        name:  userRecord.displayName ?? undefined,
        metadata: { uid },
      });
      customerId = customer.id;
    }

    // ── Create PaymentIntent (manual capture for escrow) ──────────────────
    const intent = await stripe.paymentIntents.create({
      amount:               amountCents,
      currency:             "usd",
      customer:             customerId,
      capture_method:       "manual",        // hold funds, release on confirmation
      setup_future_usage:   "off_session",
      description:          `Job: ${job.description?.slice(0, 100) ?? jobId}`,
      metadata: {
        jobId,
        homeownerId: uid,
        contractorId: job.claimedBy ?? "",
      },
    });

    // ── Store intent on job ────────────────────────────────────────────────
    await jobRef.update({
      paymentIntentId:  intent.id,
      paymentStatus:    "pending",
      stripeCustomerId: customerId,
      paymentAmountUsd: amountCents / 100,
      updatedAt:        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      clientSecret:    intent.client_secret,
      amountUsd:       amountCents / 100,
      paymentIntentId: intent.id,
    });
  } catch (err: any) {
    console.error("create-intent error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
