import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * GET /api/referral/create
 *
 * Creates or retrieves a referral code for the authenticated user.
 * Auth: Bearer token (any authenticated user)
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Verify Bearer auth
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Build the share URL from the actual request origin — never hardcode a
    // domain here, the project doesn't have a custom one yet and this was
    // previously pointing at a domain we don't own.
    const origin = new URL(req.url).origin;

    // 2. Check if referral doc already exists
    const referralRef = adminDb.collection("referrals").doc(uid);
    const referralSnap = await referralRef.get();

    if (referralSnap.exists) {
      const data = referralSnap.data()!;
      return NextResponse.json({
        code: data.code,
        shareUrl: `${origin}/join?ref=${data.code}`,
        redeemCount: data.redeemCount ?? 0,
        creditsEarned: data.creditsEarned ?? 0,
      });
    }

    // 3. Generate new referral code: first 8 chars of uid, uppercased
    const code = uid.slice(0, 8).toUpperCase();

    // 4. Create referral doc
    await referralRef.set({
      uid,
      code,
      createdAt: FieldValue.serverTimestamp(),
      redeemCount: 0,
      creditsEarned: 0,
    });

    return NextResponse.json({
      code,
      shareUrl: `${origin}/join?ref=${code}`,
      redeemCount: 0,
      creditsEarned: 0,
    });
  } catch (err: any) {
    console.error("referral/create error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to create referral code" },
      { status: 500 }
    );
  }
}
