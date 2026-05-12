import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyPayoutFailed } from "@/lib/notif";

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
 *    SUBSCRIPTION EVENTS:
 *      - checkout.session.completed (contractor subscribed to Pro/Elite)
 *      - customer.subscription.created (new subscription)
 *      - customer.subscription.updated (renewal, plan change, trial ended)
 *      - customer.subscription.deleted (cancellation → downgrade to Starter)
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

  const obj   = event.data?.object as any;
  const jobId = obj?.metadata?.jobId;
  const uid   = obj?.metadata?.uid;

  /* ── Subscription events (no jobId required) ── */
  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    try {
      await handleSubscriptionEvent(event.type, obj);
    } catch (err) {
      console.error("Subscription webhook error:", err);
    }
    return NextResponse.json({ ok: true });
  }

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
        const contractorUid = obj.metadata?.contractorUid;
        const failureCode = obj.failure_code;
        const failureMessage = obj.failure_message;

        if (transferJobId) {
          const jobRef = adminDb.collection("jobs").doc(transferJobId);
          await jobRef.update({
            payoutStatus: "failed",
            payoutFailureCode: failureCode,
            payoutFailureMessage: failureMessage,
            updatedAt: FieldValue.serverTimestamp(),
          });

          console.error(
            `❌ Transfer ${transferId} failed for job ${transferJobId}: ${failureCode} - ${failureMessage}`
          );

          // Notify contractor about failed payout
          if (contractorUid) {
            notifyPayoutFailed(contractorUid, transferJobId, failureMessage).catch(
              (err) => console.error(`Failed to notify contractor ${contractorUid}:`, err)
            );
          }
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

/* ────────────────────────────────────────────────────────────────
   Subscription helpers
──────────────────────────────────────────────────────────────── */
async function handleSubscriptionEvent(type: string, obj: any) {
  switch (type) {
    /* Checkout completed — user finished paying for a subscription */
    case "checkout.session.completed": {
      if (obj.mode !== "subscription") return;
      const uid  = obj.metadata?.uid;
      const plan = obj.metadata?.plan;
      const role = obj.metadata?.role; // "homeowner" | "contractor"
      if (!uid || !plan) return;

      if (role === "homeowner") {
        await adminDb.collection("homeowners").doc(uid).set({
          subscriptionPlan:        plan,
          subscriptionStatus:      "active",
          stripeSubscriptionId:    obj.subscription,
          stripeCustomerId:        obj.customer,
          subscriptionActivatedAt: FieldValue.serverTimestamp(),
          updatedAt:               FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ Homeowner ${uid} subscribed to ${plan}`);
      } else {
        // Default: contractor
        await adminDb.collection("contractors").doc(uid).set({
          subscriptionPlan:        plan,
          subscriptionStatus:      "active",
          stripeSubscriptionId:    obj.subscription,
          stripeCustomerId:        obj.customer,
          subscriptionActivatedAt: FieldValue.serverTimestamp(),
          updatedAt:               FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ Contractor ${uid} subscribed to ${plan}`);
      }
      break;
    }

    /* Subscription updated (renewal, plan change, trial ended) */
    case "customer.subscription.updated": {
      const uid    = obj.metadata?.uid;
      const plan   = obj.metadata?.plan;
      const role   = obj.metadata?.role;
      const status = obj.status; // "active" | "past_due" | "canceled" | "trialing" etc.
      if (!uid) return;

      const collection = role === "homeowner" ? "homeowners" : "contractors";
      await adminDb.collection(collection).doc(uid).set({
        subscriptionStatus: status,
        subscriptionPlan:   plan ?? undefined,
        updatedAt:          FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`✅ ${role === "homeowner" ? "Homeowner" : "Contractor"} ${uid} subscription ${status}`);
      break;
    }

    /* Subscription cancelled */
    case "customer.subscription.deleted": {
      const uid  = obj.metadata?.uid;
      const role = obj.metadata?.role;
      if (!uid) return;

      if (role === "homeowner") {
        await adminDb.collection("homeowners").doc(uid).set({
          subscriptionPlan:   "free",
          subscriptionStatus: "canceled",
          updatedAt:          FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`⚠️ Homeowner ${uid} subscription cancelled — downgraded to free`);
      } else {
        // Default: contractor
        await adminDb.collection("contractors").doc(uid).set({
          subscriptionPlan:   "starter",
          subscriptionStatus: "canceled",
          updatedAt:          FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`⚠️ Contractor ${uid} subscription cancelled — downgraded to starter`);
      }
      break;
    }
  }
}
