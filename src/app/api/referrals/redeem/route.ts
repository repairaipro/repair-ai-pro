import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

interface RedeemReferralRequest {
  referralCode: string;
}

export async function POST(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const refereeUserId = decoded.uid;
    const body = await req.json() as RedeemReferralRequest;

    // Find referral by code
    const referralSnap = await adminDb
      .collection("referrals")
      .where("referralCode", "==", body.referralCode)
      .get();

    if (referralSnap.empty) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    const referralDoc = referralSnap.docs[0];
    const referral = referralDoc.data() as any;

    // Validate referral
    if (referral.status !== 'active') {
      return NextResponse.json({ error: "Referral code is no longer active" }, { status: 400 });
    }

    if (new Date(referral.expiresAt.toDate ? referral.expiresAt.toDate() : referral.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Referral code has expired" }, { status: 400 });
    }

    if (referral.refereeUserId) {
      return NextResponse.json({ error: "Referral code has already been used" }, { status: 400 });
    }

    // Update referral as used
    await referralDoc.ref.update({
      status: 'used',
      refereeUserId,
      usedAt: new Date(),
      rewardStatus: 'earned',
    });

    // Award both referrer and referee
    const referrerCollection = referral.referralType === 'contractor' ? 'contractors' : 'homeowners';
    const referrerId = referral.referrerId;

    // Award referrer
    await adminDb.collection(referrerCollection).doc(referrerId).update({
      referralRewards: admin.firestore.FieldValue.increment(referral.rewardAmount),
      successfulReferrals: admin.firestore.FieldValue.increment(1),
    });

    // Award referee (slightly less reward for new user)
    const refereeReward = Math.floor(referral.rewardAmount * 0.75);
    const refereeCollection = referral.referralType === 'contractor' ? 'contractors' : 'homeowners';
    await adminDb.collection(refereeCollection).doc(refereeUserId).update({
      referralCredit: admin.firestore.FieldValue.increment(refereeReward),
      referredBy: referrerId,
      referralCode: body.referralCode,
    });

    // Log activity for activity feed
    await adminDb.collection("activities").add({
      type: 'referral_used',
      referrerId,
      refereeUserId,
      referralCode: body.referralCode,
      referralType: referral.referralType,
      rewardAmount: referral.rewardAmount,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Referral redeemed successfully",
      referrerReward: referral.rewardAmount,
      refereeReward,
    });
  } catch (err: any) {
    console.error("referral redemption error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
