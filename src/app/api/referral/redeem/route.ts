import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const CREDIT_AMOUNT = 20;

/**
 * POST /api/referral/redeem
 *
 * Redeems a referral code for a new user during signup.
 * Body: { code: string }
 * Auth: Bearer token (the NEW user who was referred)
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Verify Bearer auth
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const newUserUid = decoded.uid;

    // 2. Parse request body
    const body = await req.json();
    const { code } = body as { code?: string };

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // 3. Look up referral by code
    const referralsQuery = await adminDb
      .collection("referrals")
      .where("code", "==", normalizedCode)
      .limit(1)
      .get();

    if (referralsQuery.empty) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    const referralDoc = referralsQuery.docs[0];
    const referralData = referralDoc.data();
    const referrerUid: string = referralData.uid;

    // 4. Prevent self-referral
    if (referrerUid === newUserUid) {
      return NextResponse.json(
        { error: "Cannot use your own referral code" },
        { status: 400 }
      );
    }

    // 5. Check if new user already used a referral (check homeowners collection first, fallback to users)
    const homeownerSnap = await adminDb.collection("homeowners").doc(newUserUid).get();
    if (homeownerSnap.exists) {
      const homeownerData = homeownerSnap.data()!;
      if (homeownerData.referredBy) {
        return NextResponse.json({ error: "Already redeemed" }, { status: 400 });
      }
    } else {
      // Check users collection as fallback
      const userSnap = await adminDb.collection("users").doc(newUserUid).get();
      if (userSnap.exists) {
        const userData = userSnap.data()!;
        if (userData.referredBy) {
          return NextResponse.json({ error: "Already redeemed" }, { status: 400 });
        }
      }
    }

    // 6. Apply credit to referrer atomically
    const referralRef = adminDb.collection("referrals").doc(referrerUid);

    await referralRef.update({
      creditsEarned: FieldValue.increment(CREDIT_AMOUNT),
      redeemCount: FieldValue.increment(1),
    });

    // 7. Log redemption in sub-collection
    await referralRef
      .collection("redemptions")
      .doc(newUserUid)
      .set({
        newUserUid,
        redeemedAt: FieldValue.serverTimestamp(),
        creditsApplied: CREDIT_AMOUNT,
      });

    // 8. Mark new user as referred in homeowners collection (merge so we don't overwrite)
    await adminDb
      .collection("homeowners")
      .doc(newUserUid)
      .set(
        {
          referredBy: referrerUid,
          referralCredits: CREDIT_AMOUNT,
        },
        { merge: true }
      );

    return NextResponse.json({
      success: true,
      creditsApplied: CREDIT_AMOUNT,
      message: `You received $${CREDIT_AMOUNT} credit!`,
    });
  } catch (err: any) {
    console.error("referral/redeem error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to redeem referral code" },
      { status: 500 }
    );
  }
}
