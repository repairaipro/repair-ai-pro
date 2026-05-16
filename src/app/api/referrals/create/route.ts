import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

interface CreateReferralRequest {
  referralType: 'contractor' | 'homeowner';
  refereeEmail?: string;
  referreePhoneNumber?: string;
}

export async function POST(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const referrerId = decoded.uid;
    const body = await req.json() as CreateReferralRequest;

    if (!['contractor', 'homeowner'].includes(body.referralType)) {
      return NextResponse.json({ error: "Invalid referral type" }, { status: 400 });
    }

    // Generate unique referral code (short, shareable)
    const referralCode = `${body.referralType.slice(0, 1).toUpperCase()}${referrerId.slice(0, 8)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Create referral record
    const referralRef = await adminDb.collection("referrals").add({
      referrerId,
      referralType: body.referralType,
      referralCode,
      status: 'active', // active, used, expired
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      refereeEmail: body.refereeEmail || null,
      refereePhone: body.referreePhoneNumber || null,
      refereeUserId: null,
      rewardStatus: 'pending', // pending, earned, claimed
      rewardAmount: body.referralType === 'contractor' ? 5000 : 2000, // $50 or $20
      rewardClaimed: false,
      claimedAt: null,
    });

    // Increment referral count on user profile
    const userRef = adminDb.collection(body.referralType === 'contractor' ? 'contractors' : 'homeowners').doc(referrerId);
    await userRef.update({
      referralCodesGenerated: admin.firestore.FieldValue.increment(1),
    });

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/join?ref=${referralCode}`,
      rewardAmount: body.referralType === 'contractor' ? 5000 : 2000,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error("referral creation error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
