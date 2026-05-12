/**
 * Homeowner subscription webhook handler.
 * Called from /api/stripe/webhook/route.ts for events where metadata.role === "homeowner".
 */

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function handleHomeownerSubscription(type: string, obj: any): Promise<void> {
  switch (type) {
    /* Checkout completed — homeowner finished the Stripe Checkout flow */
    case "checkout.session.completed": {
      if (obj.mode !== "subscription") return;

      const uid  = obj.metadata?.uid;
      const plan = obj.metadata?.plan;
      if (!uid || !plan) return;

      await adminDb.collection("homeowners").doc(uid).set({
        subscriptionPlan:        plan,
        subscriptionStatus:      "active",
        stripeSubscriptionId:    obj.subscription,
        stripeCustomerId:        obj.customer,
        subscriptionActivatedAt: FieldValue.serverTimestamp(),
        updatedAt:               FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`✅ Homeowner ${uid} subscribed to ${plan}`);
      break;
    }

    /* Subscription updated */
    case "customer.subscription.updated": {
      const uid    = obj.metadata?.uid;
      const status = obj.status; // active, past_due, etc.
      if (!uid) return;

      await adminDb.collection("homeowners").doc(uid).set({
        subscriptionStatus: status === "active" ? "active" : status,
        updatedAt:          FieldValue.serverTimestamp(),
      }, { merge: true });
      break;
    }

    /* Subscription cancelled — downgrade to free tier */
    case "customer.subscription.deleted": {
      const uid = obj.metadata?.uid;
      if (!uid) return;

      await adminDb.collection("homeowners").doc(uid).set({
        subscriptionPlan:   "free",
        subscriptionStatus: "canceled",
        updatedAt:          FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`⚠️ Homeowner ${uid} subscription cancelled — downgraded to free`);
      break;
    }
  }
}
