import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface TierRequirements {
  minJobs: number;
  minRating: number;
  minMonthlyEarnings: number;
  benefitsPercentage: number;
  description: string;
}

const TIER_REQUIREMENTS: Record<LoyaltyTier, TierRequirements> = {
  bronze: {
    minJobs: 0,
    minRating: 0,
    minMonthlyEarnings: 0,
    benefitsPercentage: 0,
    description: 'Starting tier',
  },
  silver: {
    minJobs: 5,
    minRating: 4.0,
    minMonthlyEarnings: 200000, // $2000
    benefitsPercentage: 2,
    description: '5+ jobs, 4.0+ rating',
  },
  gold: {
    minJobs: 20,
    minRating: 4.5,
    minMonthlyEarnings: 500000, // $5000
    benefitsPercentage: 5,
    description: '20+ jobs, 4.5+ rating',
  },
  platinum: {
    minJobs: 50,
    minRating: 4.7,
    minMonthlyEarnings: 1000000, // $10000
    benefitsPercentage: 10,
    description: '50+ jobs, 4.7+ rating, $10k+ monthly',
  },
};

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const url = new URL(req.url);
    const userType = url.searchParams.get("type") || "contractor"; // contractor or homeowner

    const userDoc = await adminDb
      .collection(userType === 'contractor' ? 'contractors' : 'homeowners')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userDoc.data() as any;

    // Calculate current tier
    let currentTier: LoyaltyTier = 'bronze';
    const jobsCompleted = user.jobsCompleted || 0;
    const rating = user.rating || 0;

    // Get monthly earnings (last 30 days for contractors)
    let monthlyEarnings = 0;
    if (userType === 'contractor') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const jobsSnap = await adminDb
        .collection("jobs")
        .where("claimedBy", "==", uid)
        .where("payoutStatus", "==", "transferred")
        .get();

      jobsSnap.docs.forEach((doc) => {
        const job = doc.data();
        const payoutDate = job.payoutAt?.toDate ? job.payoutAt.toDate() : new Date(job.payoutAt);
        if (payoutDate >= thirtyDaysAgo) {
          monthlyEarnings += job.payoutAmount || 0;
        }
      });
    }

    // Determine tier
    const tiers: LoyaltyTier[] = ['platinum', 'gold', 'silver'];
    for (const tier of tiers) {
      const req = TIER_REQUIREMENTS[tier];
      if (jobsCompleted >= req.minJobs && rating >= req.minRating && monthlyEarnings >= req.minMonthlyEarnings) {
        currentTier = tier;
        break;
      }
    }

    // Calculate progress to next tier
    const tierProgression = ['bronze', 'silver', 'gold', 'platinum'];
    const currentTierIndex = tierProgression.indexOf(currentTier);
    const nextTier = tierProgression[currentTierIndex + 1] as LoyaltyTier | undefined;

    let progressToNextTier = 0;
    if (nextTier) {
      const nextReqs = TIER_REQUIREMENTS[nextTier];
      progressToNextTier = Math.round(
        ((jobsCompleted / nextReqs.minJobs) * 33 +
          (rating / nextReqs.minRating) * 33 +
          (monthlyEarnings / nextReqs.minMonthlyEarnings) * 34) /
          100
      );
      progressToNextTier = Math.min(100, Math.max(0, progressToNextTier));
    }

    return NextResponse.json({
      currentTier,
      nextTier,
      progressToNextTier,
      benefits: {
        feeDiscount: TIER_REQUIREMENTS[currentTier].benefitsPercentage,
        description: TIER_REQUIREMENTS[currentTier].description,
      },
      metrics: {
        jobsCompleted,
        rating: Math.round(rating * 10) / 10,
        monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
      },
      nextTierRequirements: nextTier
        ? {
            tier: nextTier,
            minJobs: TIER_REQUIREMENTS[nextTier].minJobs,
            minRating: TIER_REQUIREMENTS[nextTier].minRating,
            minMonthlyEarnings: TIER_REQUIREMENTS[nextTier].minMonthlyEarnings,
          }
        : null,
    });
  } catch (err: any) {
    console.error("loyalty status error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
