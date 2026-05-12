import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/**
 * GET /api/contractors/earnings
 * Returns earnings summary + payout history for the authenticated contractor.
 */
export async function GET(req: Request) {
  try {
    const header  = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid     = decoded.uid;

    // Query all jobs claimed by this contractor
    const snap = await adminDb
      .collection("jobs")
      .where("claimedBy", "==", uid)
      .get();

    let totalEarned   = 0;
    let pendingAmount = 0;
    let completedJobs = 0;
    const payouts: {
      jobId:       string;
      amount:      number;
      status:      string;
      trade:       string;
      description: string;
      date:        string | null;
    }[] = [];

    for (const doc of snap.docs) {
      const job = doc.data();

      if (job.payoutStatus === "transferred" && job.payoutAmount) {
        totalEarned  += job.payoutAmount;
        completedJobs++;
        payouts.push({
          jobId:       doc.id,
          amount:      job.payoutAmount,
          status:      "paid",
          trade:       job.aiDetectedTrade ?? job.trade ?? "General",
          description: (job.description ?? "").slice(0, 60),
          date:        job.payoutAt?.toDate?.()?.toISOString() ?? null,
        });
      } else if (
        job.paymentStatus === "held" ||
        (job.payoutStatus === "pending" && job.paymentAmountUsd)
      ) {
        const pendingAmt = job.payoutAmount ??
          (job.paymentAmountUsd ? job.paymentAmountUsd * 0.88 : 0);
        pendingAmount += pendingAmt;
        payouts.push({
          jobId:       doc.id,
          amount:      pendingAmt,
          status:      "pending",
          trade:       job.aiDetectedTrade ?? job.trade ?? "General",
          description: (job.description ?? "").slice(0, 60),
          date:        null,
        });
      }
    }

    // Sort newest first
    payouts.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json({
      totalEarned:   Math.round(totalEarned   * 100) / 100,
      pendingAmount: Math.round(pendingAmount  * 100) / 100,
      completedJobs,
      totalJobs:     snap.size,
      payouts:       payouts.slice(0, 20), // last 20
    });
  } catch (err: any) {
    console.error("earnings error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
