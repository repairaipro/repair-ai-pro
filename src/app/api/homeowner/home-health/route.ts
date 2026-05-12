import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/**
 * GET /api/homeowner/home-health
 *
 * Returns a "Home Health Score" (0–100) plus spending analytics and
 * rule-based insights derived from the homeowner's job history.
 *
 * Auth: Bearer token (homeowner)
 */
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

    // 2. Fetch all jobs for this homeowner (up to 50, newest first)
    const snap = await adminDb
      .collection("jobs")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const now = Date.now();
    const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;
    const MS_90_DAYS = 90 * 24 * 60 * 60 * 1000;

    // 3. Calculate Home Health Score
    let score = 85; // baseline

    let totalSpent = 0;
    let last30DaysSpent = 0;
    let completedJobs = 0;
    let disputedJobs = 0;
    const tradeBreakdown: Record<string, number> = {};
    let jobsInLast90Days = 0;

    for (const docSnap of snap.docs) {
      const job = docSnap.data();

      // Resolve timestamp to ms
      const createdMs: number =
        job.createdAt?.toDate?.()?.getTime() ?? now;

      const ageMs = now - createdMs;

      if (ageMs < MS_90_DAYS) {
        jobsInLast90Days++;
      }

      // Trade breakdown
      const trade: string = job.aiDetectedTrade ?? job.trade ?? "General";
      tradeBreakdown[trade] = (tradeBreakdown[trade] ?? 0) + 1;

      const status: string = job.status ?? "";

      // Score adjustments
      if (status === "triaged" || status === "in_progress") {
        score -= 3; // active/open issues
      }

      if (
        status === "completed" ||
        status === "confirmed" ||
        status === "verified"
      ) {
        score += 2; // repairs done = health improved
        completedJobs++;

        const amount: number = job.paymentAmountUsd ?? 0;
        totalSpent += amount;

        if (ageMs < MS_30_DAYS) {
          last30DaysSpent += amount;
        }
      }

      if (status === "disputed") {
        disputedJobs++;
        score -= 10;
      }

      // Stale triaged jobs older than 30 days
      if (status === "triaged" && ageMs > MS_30_DAYS) {
        score -= 5;
      }
    }

    // Bonus: no jobs in last 90 days → well-maintained home
    if (jobsInLast90Days === 0) {
      score += 5;
    }

    // Clamp between 0 and 100
    score = Math.min(100, Math.max(0, score));

    // 4. Spending calculations
    const avgJobCost =
      completedJobs > 0
        ? Math.round((totalSpent / completedJobs) * 100) / 100
        : 0;

    totalSpent = Math.round(totalSpent * 100) / 100;
    last30DaysSpent = Math.round(last30DaysSpent * 100) / 100;

    // 5. Rule-based insights
    const insights: string[] = [];

    if (score < 60) {
      insights.push(
        "Your home has several unresolved issues that may worsen without attention"
      );
    }

    for (const [trade, count] of Object.entries(tradeBreakdown)) {
      if (count >= 3) {
        insights.push(
          `You've had ${count} ${trade} issues — consider a preventive inspection`
        );
      }
    }

    if (totalSpent > 5000) {
      insights.push(
        `You've invested $${totalSpent.toLocaleString()} in your home this year — great for property value`
      );
    }

    if (disputedJobs > 0) {
      insights.push(
        "You have a disputed job. Resolving it quickly protects your home warranty"
      );
    }

    if (jobsInLast90Days === 0) {
      insights.push("No recent repairs — your home is in great shape!");
    }

    // Always included
    insights.push(
      "Regular maintenance saves 1-3% of home value annually — keep it up"
    );

    // 6. Return response
    return NextResponse.json({
      score,
      totalSpent,
      last30DaysSpent,
      avgJobCost,
      totalJobs: snap.size,
      completedJobs,
      tradeBreakdown,
      insights,
    });
  } catch (err: any) {
    console.error("home-health error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to calculate home health score" },
      { status: 500 }
    );
  }
}
