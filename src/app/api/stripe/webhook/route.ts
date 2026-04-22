import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Stripe webhook handler.
 * Listens for PaymentIntent, Transfer, and Account events and keeps job + contractor status in sync.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://dashboard.stripe.com/webhooks
 * 2. Click "Add an endpoint"
 * 3. Endpoint URL: https://yourdomain.com/api/stripe/webhook (must be public, HTTPS)
 * 4. Select events to listen for:
 *    PAYMENT INTENT EVENTS:
 *      - payment_intent.amount_capturable_updated (funds authorized + held)
 *      - payment_intent.succeeded (funds captured)
 *      - payment_intent.payment_failed (payment failed)
 *      - payment_intent.canceled (payment cancelled/refunded)
 *
 *    CONTRACTOR CONNECT ACCOUNT EVENTS:
 *      - account.updated (KYC verification, requirements changed)
 *
 *    PAYOUT TRANSFER EVENTS:
 *      - transfer.created (payout to contractor processed)
 *      - transfer.failed (payout to contractor failed)
 *
 * 5. Copy your signing secret (Signing secret field)
 * 6. Paste it into your .env.local as STRIPE_WEBHOOK_SECRET
 *
 * In development (without STRIPE_WEBHOOK_SECRET), webhook will accept unsigned events.
 */
export async function POST(req: Request) {
  const sig     = req.headers.get("stripe-signature") ?? "";
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  let event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(rawBody, sig, secret)
      : JSON.parse(rawBody); // dev-mode: accept unsigned events
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const obj = event.data?.object as any;
  const jobId  = obj?.metadata?.jobId;

  if (!jobId) return NextResponse.json({ ok: true }); // unrelated event

  const jobRef = adminDb.collection("jobs").doc(jobId);

  try {
    switch (event.type) {
      // Funds are authorized and held — homeowner's card was charged
      case "payment_intent.amount_capturable_updated": {
        await jobRef.update({
          paymentStatus: "held",
          paymentHeldAt: FieldValue.serverTimestamp(),
          updatedAt:     FieldValue.serverTimestamp(),
        });

        // Log timeline event
        await jobRef.collection("events").add({
          type:      "payment_held",
          amount:    obj.amount / 100,
          createdAt: FieldValue.serverTimestamp(),
        });
        break;
      }

      // Funds captured (released to contractor after confirmation)
      case "payment_intent.succeeded": {
        await jobRef.update({
          paymentStatus:    "released",
          paymentReleasedAt: FieldValue.serverTimestamp(),
          updatedAt:        FieldValue.serverTimestamp(),
        });

        await jobRef.collection("events").add({
          type:      "payment_released",
          amount:    obj.amount / 100,
          createdAt: FieldValue.serverTimestamp(),
        });
        break;
      }

      // Payment failed
      case "payment_intent.payment_failed": {
        await jobRef.update({
          paymentStatus: "failed",
          updatedAt:     FieldValue.serverTimestamp(),
        });
        break;
      }

      // Payment cancelled / refunded
      case "payment_intent.canceled": {
        await jobRef.update({
          paymentStatus: "refunded",
          updatedAt:     FieldValue.serverTimestamp(),
        });
        break;
      }

      // PHASE 5: Stripe Connect account updated (KYC verification, requirements, etc.)
      case "account.updated": {
        const accountId = obj.id;
        // Find the contractor with this stripeConnectAccountId
        const contractorSnap = await adminDb
          .collection("contractors")
          .where("stripeConnectAccountId", "==", accountId)
          .limit(1)
          .get();

        if (!contractorSnap.empty) {
          const contractorDoc = contractorSnap.docs[0];
          const isNowVerified =
            obj.charges_enabled && obj.payouts_enabled ? true : false;
          const requirementsComplete = obj.requirements?.current_deadline === undefined;

          await contractorDoc.ref.update({
            stripeConnectVerified: isNowVerified,
            stripeConnectOnboardingComplete: requirementsComplete,
            updatedAt: FieldValue.serverTimestamp(),
          });

          console.log(
            `✅ Updated Stripe Connect status for contractor ${contractorDoc.id}: verified=${isNowVerified}, requirements=${obj.requirements?.current_deadline ? "pending" : "complete"}`
          );
        }
        break;
      }

      // PHASE 5: Transfer to contractor's Connect account was created
      case "transfer.created": {
        const transferId = obj.id;
        const transferJobId = obj.metadata?.jobId;
        const contractorUid = obj.metadata?.contractorUid;

        if (transferJobId) {
          await adminDb.collection("jobs").doc(transferJobId).update({
            payoutTransferId: transferId,
            payoutStatus: "transferred",
            payoutAt: FieldValue.serverTimestamp(),
          });

          console.log(
            `✅ Transfer ${transferId} created for job ${transferJobId}, contractor ${contractorUid}`
          );
        }
        break;
      }

      // PHASE 5: Transfer to contractor failed
      case "transfer.failed": {
        const transferId = obj.id;
        const transferJobId = obj.metadata?.jobId;
        const failureCode = obj.failure_code;
        const failureMessage = obj.failure_message;

        if (transferJobId) {
          await adminDb.collection("jobs").doc(transferJobId).update({
            payoutStatus: "failed",
            payoutFailureCode: failureCode,
            payoutFailureMessage: failureMessage,
            updatedAt: FieldValue.serverTimestamp(),
          });

          console.error(
            `❌ Transfer ${transferId} failed for job ${transferJobId}: ${failureCode} - ${failureMessage}`
          );

          // TODO: Notify contractor via email/push that payout failed
          // Retry logic could be implemented here (e.g., retry after 24h if temporary failure)
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Still return 200 so Stripe doesn't retry indefinitely
  }

  return NextResponse.json({ ok: true });
}

// Required: disable body parsing so Stripe signature verification works
export const config = { api: { bodyParser: false } };
