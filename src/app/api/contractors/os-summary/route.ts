import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/**
 * GET /api/contractors/os-summary
 *
 * The data backbone of the Contractor OS — one call that aggregates money,
 * pipeline, reputation, and audience so the command center renders fast.
 * Auth: Bearer token (the contractor).
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const uid = (await adminAuth.verifyIdToken(token)).uid;

    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const MONTH = 30 * 24 * 60 * 60 * 1000;
    const PLATFORM_TAKE = 0.88; // contractor keeps 88%

    const [contractorSnap, jobsSnap, invitesSnap, postsSnap] = await Promise.all([
      adminDb.collection("contractors").doc(uid).get(),
      adminDb.collection("jobs").where("claimedBy", "==", uid).limit(300).get(),
      adminDb.collection("contractors").doc(uid).collection("jobInbox")
        .where("invitationStatus", "==", "pending").limit(50).get(),
      adminDb.collection("posts").where("contractorId", "==", uid).limit(100).get(),
    ]);

    const c = contractorSnap.data() ?? {};

    // ── Money + pipeline from jobs ──
    let weekEarnings = 0, monthEarnings = 0, lifetimeEarnings = 0, pendingPayout = 0;
    let activeCount = 0, awaitingConfirmCount = 0, completedThisMonth = 0;
    const actionItems: { jobId: string; label: string; status: string; description: string }[] = [];

    for (const d of jobsSnap.docs) {
      const j = d.data();
      const amt = Number(j.paymentAmountUsd ?? 0);
      const payout = j.payoutAmount ?? amt * PLATFORM_TAKE;
      const status = j.status as string;
      const confirmedAt = j.confirmedAt?.toDate?.()?.getTime?.() ?? j.updatedAt?.toDate?.()?.getTime?.() ?? 0;

      if (status === "confirmed" || status === "verified" || j.paymentStatus === "released") {
        lifetimeEarnings += payout;
        if (now - confirmedAt < WEEK) weekEarnings += payout;
        if (now - confirmedAt < MONTH) { monthEarnings += payout; completedThisMonth++; }
      }
      if (j.paymentStatus === "held" || (status === "completed" && amt > 0)) {
        pendingPayout += payout;
      }

      if (status === "accepted") {
        activeCount++;
        actionItems.push({ jobId: d.id, label: "Start this job", status, description: (j.description ?? "").slice(0, 60) });
      } else if (status === "in_progress") {
        activeCount++;
        actionItems.push({ jobId: d.id, label: "Mark complete", status, description: (j.description ?? "").slice(0, 60) });
      } else if (status === "completed") {
        awaitingConfirmCount++;
      }
    }

    // ── Audience from posts ──
    let postLikes = 0, postComments = 0;
    for (const p of postsSnap.docs) {
      postLikes += Number(p.data().likeCount ?? 0);
      postComments += Number(p.data().commentCount ?? 0);
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: c.name ?? null,
        photoUrl: c.photoUrl ?? null,
        trade: c.trade ?? null,
        availability: c.availability ?? "offline",
        verificationStatus: c.verificationStatus ?? "unverified",
        stripeConnectVerified: c.stripeConnectVerified ?? false,
      },
      money: {
        weekEarnings: Math.round(weekEarnings),
        monthEarnings: Math.round(monthEarnings),
        lifetimeEarnings: Math.round(lifetimeEarnings),
        pendingPayout: Math.round(pendingPayout),
      },
      reputation: {
        rating: Number(c.avgRating ?? c.rating ?? 0),
        reviewCount: Number(c.reviewCount ?? 0),
        qualityScore: Number(c.qualityScore ?? 0),
        responseScore: Number(c.responseScore ?? 0),
        verifiedSpecialties: Number(c.verifiedSpecialties ?? 0),
        jobsCompleted: Number(c.jobsCompleted ?? 0),
      },
      pipeline: {
        newLeads: invitesSnap.size,
        active: activeCount,
        awaitingConfirm: awaitingConfirmCount,
        completedThisMonth,
      },
      audience: {
        followerCount: Number(c.followerCount ?? 0),
        postCount: postsSnap.size,
        postLikes,
        postComments,
      },
      actionItems: actionItems.slice(0, 5),
    });
  } catch (err: any) {
    console.error("os-summary error:", err);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
