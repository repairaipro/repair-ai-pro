import { NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebaseAdmin";
import { scoreContractorMatch } from "@/lib/matching";

export async function POST(req: Request) {
  try {
    const decoded = await verifyAuthToken(req).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId } = body ?? {};

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId" },
        { status: 400 }
      );
    }

    const jobSnap = await adminDb.collection("jobs").doc(jobId).get();

    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const job = jobSnap.data() as any;

    const trade = job.aiTrade || job.trade || null;

    const jobLocation = {
      zone: job.zone || job.locationZone || "",
      city: job.city || job.location?.city || "",
      zipCode: job.zipCode || job.location?.zipCode || "",
      lat: job.location?.lat ?? null,
      lng: job.location?.lng ?? null,
    };

    const results: any[] = [];

    const contractorsSnap = await adminDb.collection("contractors").get();

    contractorsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      const match = scoreContractorMatch(
        {
          id: docSnap.id,
          role: "contractor",
          trade: data.trade,
          trades: data.trades || [],
          availability: data.availability || "offline",
          serviceZones: data.serviceZones || [],
          city: data.city || null,
          zipCode: data.zipCode || null,
          serviceRadiusMiles: data.serviceRadiusMiles || 15,
          reputationScore: data.reputationScore ?? 0,
          jobsCompleted: data.jobsCompleted ?? 0,
          location: data.location || null,
        },
        {
          trade,
          location: jobLocation,
        }
      );

      if (!match.matched) return;

      results.push({
        id: docSnap.id,
        providerType: "contractor",
        displayName: data.displayName || data.name || "Contractor",
        trade: data.trade || null,
        trades: data.trades || [],
        availability: data.availability || "offline",
        reputationScore: data.reputationScore ?? 0,
        jobsCompleted: data.jobsCompleted ?? 0,
        distanceMiles: match.distanceMiles,
        score: match.score,
        matchReason: match.reason,
        phone: data.phone || null,
        website: data.website || null,
        city: data.city || null,
        zipCode: data.zipCode || null,
      });
    });

    const businessesSnap = await adminDb.collection("businesses").get();

    businessesSnap.forEach((docSnap) => {
      const data = docSnap.data();

      const match = scoreContractorMatch(
        {
          id: docSnap.id,
          role: "contractor",
          trade: data.trade,
          trades: data.trades || [],
          availability: data.availability || "available",
          serviceZones: data.serviceZones || [],
          city: data.city || null,
          zipCode: data.zipCode || null,
          serviceRadiusMiles: data.serviceRadiusMiles || 15,
          reputationScore: data.reputationScore ?? data.rating ?? 0,
          jobsCompleted: data.jobsCompleted ?? 0,
          location: data.location || null,
        },
        {
          trade,
          location: jobLocation,
        }
      );

      if (!match.matched) return;

      results.push({
        id: docSnap.id,
        providerType: "business",
        displayName: data.displayName || data.name || "Business",
        trade: data.trade || null,
        trades: data.trades || [],
        availability: data.availability || "available",
        reputationScore: data.reputationScore ?? data.rating ?? 0,
        jobsCompleted: data.jobsCompleted ?? 0,
        distanceMiles: match.distanceMiles,
        score: match.score,
        matchReason: match.reason,
        phone: data.phone || null,
        website: data.website || null,
        city: data.city || null,
        zipCode: data.zipCode || null,
        claimed: data.claimed ?? false,
        businessType: data.businessType || "local_business",
      });
    });

    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      trade,
      providers: results.slice(0, 25),
    });
  } catch (err: any) {
    console.error("match-providers error:", err);

    return NextResponse.json(
      { error: err.message || "Failed to match providers" },
      { status: 500 }
    );
  }
}