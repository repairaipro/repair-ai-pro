import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

interface RecommendedContractor {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  trade: string;
  city: string;
  responseTime: number;
  matchScore: number; // 0-100
  reasonsForMatch: string[];
}

export async function POST(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const body = await req.json();
    const { trade, city, jobComplexity = 'medium', budget } = body;

    // Get homeowner profile
    const homeownerDoc = await adminDb.collection("homeowners").doc(uid).get();
    if (!homeownerDoc.exists) {
      return NextResponse.json({ error: "Homeowner not found" }, { status: 404 });
    }

    // Query contractors in the area
    const contractorSnap = await adminDb
      .collection("contractors")
      .where("trade", "==", trade)
      .where("city", "==", city)
      .get();

    if (contractorSnap.empty) {
      return NextResponse.json({
        contractors: [],
        message: `No ${trade} contractors found in ${city}. We'll notify you when one becomes available.`,
      });
    }

    // Score and rank contractors
    const recommendations: RecommendedContractor[] = [];

    for (const doc of contractorSnap.docs) {
      const contractor = doc.data() as any;

      // Skip if contractor is not available
      if (contractor.busyStatus === 'fully_booked') continue;

      let matchScore = 0;
      const reasons: string[] = [];

      // Rating score (40% weight)
      const ratingScore = Math.min(contractor.rating || 0, 5) / 5 * 40;
      matchScore += ratingScore;
      if ((contractor.rating || 0) >= 4.5) {
        reasons.push('Highly rated');
      } else if ((contractor.rating || 0) >= 4.0) {
        reasons.push('Good rating');
      }

      // Response time score (30% weight)
      const responseMinutes = contractor.averageResponseMinutes || 180;
      const responseScore = Math.max(0, 30 - (responseMinutes / 60));
      matchScore += responseScore;
      if (responseMinutes <= 60) {
        reasons.push('Fast response time');
      }

      // Completion rate score (20% weight)
      const jobsCompleted = contractor.jobsCompleted || 0;
      const jobsAccepted = contractor.jobsAccepted || 0;
      const completionRate = jobsAccepted > 0 ? (jobsCompleted / jobsAccepted) : 0;
      matchScore += completionRate * 20;
      if (completionRate >= 0.95) {
        reasons.push('Excellent completion rate');
      }

      // Complexity match (10% weight)
      const complexityScore = calculateComplexityMatch(contractor, jobComplexity);
      matchScore += complexityScore;

      // Budget match bonus
      if (budget && contractor.averageJobValue) {
        const diff = Math.abs(contractor.averageJobValue - budget) / budget;
        if (diff < 0.2) {
          reasons.push('Within your budget');
          matchScore += 5;
        }
      }

      // Recent jobs bonus
      if ((contractor.jobsCompleted || 0) >= 10) {
        reasons.push('Experienced');
      }

      // Nearby bonus
      if (contractor.serviceRadius && contractor.serviceRadius >= 15) {
        reasons.push('Serves your area');
      }

      if (matchScore > 30) { // Only include contractors with min score
        recommendations.push({
          id: doc.id,
          name: contractor.firstName || 'Contractor',
          rating: Math.round((contractor.rating || 0) * 10) / 10,
          reviewCount: contractor.reviewCount || 0,
          trade: contractor.trade,
          city: contractor.city,
          responseTime: contractor.averageResponseMinutes || 0,
          matchScore: Math.round(matchScore),
          reasonsForMatch: reasons,
        });
      }
    }

    // Sort by match score, highest first
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      contractors: recommendations.slice(0, 5), // Top 5 matches
      totalFound: recommendations.length,
      searchCriteria: { trade, city, complexity: jobComplexity },
    });
  } catch (err: any) {
    console.error("recommendations error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}

function calculateComplexityMatch(contractor: any, jobComplexity: string): number {
  const complexityLevels = contractor.complexityLevel || 'medium';

  const complexityMap: Record<string, number[]> = {
    simple: [10, 5, 0],
    medium: [5, 10, 5],
    complex: [0, 5, 10],
  };

  const complexityIndex = ['simple', 'medium', 'complex'].indexOf(jobComplexity);
  const contractorIndex = ['simple', 'medium', 'complex'].indexOf(complexityLevels);

  if (complexityIndex === -1 || contractorIndex === -1) return 5;
  return complexityMap[jobComplexity][contractorIndex];
}
