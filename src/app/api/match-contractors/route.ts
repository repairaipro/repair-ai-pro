import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collection, getDocs } from "firebase/firestore";
import { scoreContractorMatch } from "@/lib/matching";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const decoded = await verifyAuthToken(req).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { trade, jobLocation } = body ?? {};

    if (!jobLocation) {
      return NextResponse.json(
        { error: "Missing jobLocation" },
        { status: 400 }
      );
    }

    const snap = await getDocs(collection(db, "users"));
    const matches: any[] = [];

    snap.forEach((userDoc) => {
      const data = userDoc.data() as any;

      const result = scoreContractorMatch(
        {
          id: userDoc.id,
          ...data,
        },
        {
          trade,
          location: jobLocation,
        }
      );

      if (!result.matched) return;

      matches.push({
        id: userDoc.id,
        score: result.score,
        reason: result.reason,
        distanceMiles: result.distanceMiles,
        displayName: data.displayName || data.name || "Contractor",
        trade: data.trade || null,
        trades: data.trades || [],
        availability: data.availability || "offline",
        reputationScore: data.reputationScore ?? 0,
        jobsCompleted: data.jobsCompleted ?? 0,
      });
    });

    matches.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      contractors: matches,
    });
  } catch (err) {
    console.error("match-contractors error:", err);

    return NextResponse.json(
      { error: "Contractor matching failed" },
      { status: 500 }
    );
  }
}