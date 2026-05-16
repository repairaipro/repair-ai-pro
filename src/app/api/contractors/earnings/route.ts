import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "90";
    const days = parseInt(range, 10);

    // Get contractor profile for stats
    const contractorDoc = await adminDb.collection("contractors").doc(uid).get();
    if (!contractorDoc.exists) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    const contractor = contractorDoc.data() as any;

    // Query all jobs claimed by this contractor
    const snap = await adminDb
      .collection("jobs")
      .where("claimedBy", "==", uid)
      .get();

    let totalEarned = 0;
    let pendingAmount = 0;
    let completedJobs = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
    const monthlyMap = new Map<string, number>();
    const tradeMap = new Map<string, { total: number; count: number }>();
    const payouts: {
      jobId: string;
      amount: number;
      status: string;
      trade: string;
      description: string;
      date: string | null;
    }[] = [];

    for (const doc of snap.docs) {
      const job = doc.data();

      if (job.payoutStatus === "transferred" && job.payoutAmount) {
        totalEarned += job.payoutAmount;
        completedJobs++;
        payouts.push({
          jobId: doc.id,
          amount: job.payoutAmount,
          status: "paid",
          trade: job.aiDetectedTrade ?? job.trade ?? "General",
          description: (job.description ?? "").slice(0, 60),
          date: job.payoutAt?.toDate?.()?.toISOString() ?? null,
        });

        // Monthly breakdown (only recent)
        const payoutDate = job.payoutAt?.toDate ? job.payoutAt.toDate() : new Date(job.payoutAt);
        if (payoutDate >= thirtyDaysAgo) {
          const monthKey = payoutDate.toISOString().split("T")[0];
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + job.payoutAmount);
        }

        // By trade
        const trade = job.aiDetectedTrade ?? job.trade ?? "Other";
        const current = tradeMap.get(trade) || { total: 0, count: 0 };
        current.total += job.payoutAmount;
        current.count += 1;
        tradeMap.set(trade, current);
      } else if (job.paymentStatus === "held" || (job.payoutStatus === "pending" && job.paymentAmountUsd)) {
        const pendingAmt = job.payoutAmount ?? (job.paymentAmountUsd ? job.paymentAmountUsd * 0.88 : 0);
        pendingAmount += pendingAmt;
        payouts.push({
          jobId: doc.id,
          amount: pendingAmt,
          status: "pending",
          trade: job.aiDetectedTrade ?? job.trade ?? "General",
          description: (job.description ?? "").slice(0, 60),
          date: null,
        });
      }
    }

    // Convert maps to arrays
    const monthlyEarnings = Array.from(monthlyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byTrade = Array.from(tradeMap.entries())
      .map(([trade, { total, count }]) => ({
        trade,
        total: Math.round(total * 100) / 100,
        count,
        avg: Math.round((total / count) * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);

    const averagePerJob = completedJobs > 0 ? Math.round((totalEarned / completedJobs) * 100) / 100 : 0;
    const jobsAccepted = contractor.jobsAccepted || 0;
    const completionRate = jobsAccepted > 0 ? Math.round(((completedJobs / jobsAccepted) * 100) * 10) / 10 : 0;
    const rating = Math.round((contractor.rating || 0) * 10) / 10;
    const responseTime = contractor.averageResponseMinutes || 0;

    // Count reviews for this contractor
    let reviewCount = 0;
    const reviewsSnapshot = await adminDb
      .collection("reviews")
      .where("contractorId", "==", uid)
      .get();
    reviewCount = reviewsSnapshot.size;

    // Calculate rating trend (group by date over last 30 days)
    const ratingTrendMap = new Map<string, { sum: number; count: number }>();
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);

    reviewsSnapshot.docs.forEach((doc) => {
      const review = doc.data();
      const reviewDate = review.createdAt?.toDate ? review.createdAt.toDate() : new Date(review.createdAt);
      if (reviewDate >= thirtyDaysAgoDate) {
        const dateKey = reviewDate.toISOString().split("T")[0];
        const current = ratingTrendMap.get(dateKey) || { sum: 0, count: 0 };
        current.sum += review.rating || 0;
        current.count += 1;
        ratingTrendMap.set(dateKey, current);
      }
    });

    const ratingTrend = Array.from(ratingTrendMap.entries())
      .map(([date, { sum, count }]) => ({
        date,
        rating: Math.round((sum / count) * 10) / 10,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate response time trend (from job invitations)
    const responseTimeTrendMap = new Map<string, { sum: number; count: number }>();
    const jobsSnapshot = await adminDb
      .collection("jobs")
      .where("claimedBy", "==", uid)
      .get();

    jobsSnapshot.docs.forEach((doc) => {
      const job = doc.data();
      if (job.invitedAt && job.acceptedAt) {
        const invitedDate = job.invitedAt?.toDate ? job.invitedAt.toDate() : new Date(job.invitedAt);
        const acceptedDate = job.acceptedAt?.toDate ? job.acceptedAt.toDate() : new Date(job.acceptedAt);
        const responseMinutes = (acceptedDate.getTime() - invitedDate.getTime()) / (1000 * 60);

        if (invitedDate >= thirtyDaysAgoDate && responseMinutes > 0 && responseMinutes < 1440) { // Less than 24 hours
          const dateKey = invitedDate.toISOString().split("T")[0];
          const current = responseTimeTrendMap.get(dateKey) || { sum: 0, count: 0 };
          current.sum += responseMinutes;
          current.count += 1;
          responseTimeTrendMap.set(dateKey, current);
        }
      }
    });

    const responseTimeTrend = Array.from(responseTimeTrendMap.entries())
      .map(([date, { sum, count }]) => ({
        date,
        minutes: Math.round((sum / count) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate peer percentile
    let percentile = 0;
    if (completedJobs > 0 && contractor.trade && contractor.city) {
      const peersSnapshot = await adminDb
        .collection("contractors")
        .where("trade", "==", contractor.trade)
        .where("city", "==", contractor.city)
        .get();

      const peers = peersSnapshot.docs
        .map((doc) => doc.data() as any)
        .filter((p) => p.jobsCompleted > 0);

      if (peers.length > 1) {
        // Calculate total earnings for each peer
        const peerEarnings = await Promise.all(
          peers.map(async (peer) => {
            const peerJobs = await adminDb
              .collection("jobs")
              .where("claimedBy", "==", peer.uid || peer.id)
              .where("payoutStatus", "==", "transferred")
              .get();

            const total = peerJobs.docs.reduce((sum, doc) => {
              const data = doc.data() as any;
              return sum + (data.payoutAmount || 0);
            }, 0);

            return total;
          })
        );

        // Calculate percentile
        const betterPeers = peerEarnings.filter((e) => e > totalEarned).length;
        percentile = Math.round(((peers.length - betterPeers) / peers.length) * 100);
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
      totalEarned: Math.round(totalEarned * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      completedJobs,
      totalJobs: snap.size,
      averagePerJob,
      monthlyEarnings,
      byTrade,
      completionRate,
      rating,
      responseTime,
      percentile,
      reviewCount,
      ratingTrend,
      responseTimeTrend,
      payouts: payouts.slice(0, 20), // last 20
    });
  } catch (err: any) {
    console.error("earnings error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
