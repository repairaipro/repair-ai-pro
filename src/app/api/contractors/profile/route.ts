import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/**
 * GET /api/contractors/profile
 * Returns the authenticated contractor's profile + earnings summary.
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const header  = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid     = decoded.uid;

    const snap = await adminDb.collection("contractors").doc(uid).get();
    if (!snap.exists) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const data = snap.data()!;

    // ── Aggregate earnings from confirmed/verified jobs ──────────────────
    const jobsSnap = await adminDb
      .collection("jobs")
      .where("claimedBy", "==", uid)
      .where("status", "in", ["confirmed", "verified", "completed"])
      .get();

    let totalEarned    = 0;
    let jobsCompleted  = 0;
    let pendingPayout  = 0;
    const recentPayouts: {
      amount: number;
      date: string | null;
      status: "paid" | "pending";
      trade: string;
    }[] = [];

    for (const jdoc of jobsSnap.docs) {
      const j = jdoc.data() as any;
      const amount = Number(j.paymentAmountUsd ?? 0);
      if (amount <= 0) continue;

      // Platform fee
      const platformFee   = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? 12) / 100;
      const contractorCut = Math.round(amount * (1 - platformFee) * 100) / 100;
      const trade         = j.aiDetectedTrade ?? j.trade ?? "General";

      if (j.status === "confirmed" || j.status === "verified") {
        totalEarned += contractorCut;
        jobsCompleted++;
        const date = j.confirmedAt?.toDate?.().toISOString?.() ?? null;
        recentPayouts.push({ amount: contractorCut, date, status: "paid", trade });
      } else if (j.status === "completed") {
        pendingPayout += contractorCut;
        recentPayouts.push({ amount: contractorCut, date: null, status: "pending", trade });
      }
    }

    // Sort newest first, keep last 30
    recentPayouts.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json({
      uid,
      name:                  data.name             ?? null,
      email:                 data.email            ?? null,
      subscriptionPlan:      data.subscriptionPlan ?? "free",
      subscriptionStatus:    data.subscriptionStatus ?? "inactive",
      stripeConnectVerified: data.stripeConnectVerified ?? false,
      trades:                data.trades           ?? [],
      rating:                data.avgRating         ?? data.rating ?? null,
      reviewCount:           data.reviewCount      ?? 0,
      // Earnings
      totalEarned,
      jobsCompleted,
      pendingPayout,
      recentPayouts: recentPayouts.slice(0, 30),
    });
  } catch (err: any) {
    console.error("contractor/profile error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/contractors/profile
 * Allowed fields: isAvailable, notifPrefs
 */
export async function PATCH(req: Request) {
  try {
    const header  = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid     = decoded.uid;

    const body = await req.json();
    const allowed = ["isAvailable", "notifPrefs"] as const;
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }
    if (!Object.keys(update).length) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    await adminDb.collection("contractors").doc(uid).update({
      ...update,
      updatedAt: (await import("firebase-admin/firestore")).FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("contractor/profile PATCH error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
