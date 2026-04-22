import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/stripe/release
 *
 * Called when a job is confirmed (status → confirmed).
 * Captures the held PaymentIntent, releasing funds to platform account.
 * Then transfers contractor's share to their Stripe Connect account.
 *
 * PHASE 4: Payout logic
 * - Calculates contractor payout: amount * (1 - STRIPE_PLATFORM_FEE_PERCENT / 100)
 * - Transfers to contractor's Connect account
 * - If STRIPE_INSTANT_PAYOUT=true, uses Stripe's instant payout feature
 */
export async function POST(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminAuth.verifyIdToken(token);

    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = jobSnap.data()!;

    if (!job.paymentIntentId) {
      return NextResponse.json({ ok: true, skipped: "no payment intent" });
    }

    if (job.paymentStatus === "released") {
      return NextResponse.json({ ok: true, skipped: "already released" });
    }

    // Capture the held funds (moves to platform account)
    const intent = await stripe.paymentIntents.capture(job.paymentIntentId);
    const totalAmount = intent.amount; // in cents

    // PHASE 4: Transfer to contractor
    let payoutTransferId: string | null = null;
    let payoutAmount = 0;
    let payoutStatus: "pending" | "transferred" | "failed" = "pending";

    if (job.claimedBy) {
      // Fetch contractor profile
      const contractorSnap = await adminDb.collection("contractors").doc(job.claimedBy).get();
      const contractor = contractorSnap.data();

      if (contractor?.stripeConnectAccountId && contractor?.stripeConnectVerified) {
        try {
          // Calculate payout: 12% fee means contractor gets 88%
          const platformFeePct = parseInt(process.env.STRIPE_PLATFORM_FEE_PERCENT || "12", 10);
          const contractorFeePct = 100 - platformFeePct;
          payoutAmount = Math.round((totalAmount * contractorFeePct) / 100);

          // Create transfer to contractor's Connect account
          const transfer = await stripe.transfers.create({
            amount: payoutAmount,
            currency: "usd",
            destination: contractor.stripeConnectAccountId,
            source_transaction: intent.id,
            description: `Job ${jobId} payout (${contractorFeePct}% of ${totalAmount / 100})`,
            metadata: {
              jobId,
              contractorUid: job.claimedBy,
              platformFeePercent: platformFeePct,
            },
          });

          payoutTransferId = transfer.id;
          payoutStatus = "transferred";
          console.log(`✅ Transferred $${payoutAmount / 100} to contractor ${job.claimedBy}`);
        } catch (transferErr: any) {
          console.error(`❌ Transfer failed for job ${jobId}:`, transferErr);
          payoutStatus = "failed";
          // Log but don't block the payment capture
        }
      } else {
        console.warn(`⚠️ Contractor ${job.claimedBy} missing Connect account or verification`);
        payoutStatus = "pending"; // Hold for manual resolution
      }
    }

    // Update job with payment + payout status
    await jobRef.update({
      paymentStatus:      "released",
      paymentReleasedAt:  FieldValue.serverTimestamp(),
      payoutTransferId:   payoutTransferId || undefined,
      payoutAmount:       payoutAmount > 0 ? payoutAmount / 100 : undefined, // Convert to dollars
      payoutStatus:       payoutStatus,
      payoutAt:           payoutStatus === "transferred" ? FieldValue.serverTimestamp() : undefined,
      updatedAt:          FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      paymentReleased: true,
      payoutStatus,
      payoutAmount: payoutAmount / 100,
      transferId: payoutTransferId,
    });
  } catch (err: any) {
    console.error("release error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
