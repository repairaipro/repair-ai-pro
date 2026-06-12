import { NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
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
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const jobSnap = await adminDb.collection("jobs").doc(jobId).get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data() as any;

    const trade =
      job.aiTrade ||
      job.trade ||
      null;

    const jobLocation = {
      zone: job.zone || job.locationZone || "",
      city: job.city || job.location?.city || "",
      zipCode: job.zipCode || job.location?.zipCode || "",
      lat: job.location?.lat,
      lng: job.location?.lng,
    };

    const usersSnap = await adminDb.collection("users").limit(500).get();
    const ranked: any[] = [];

    usersSnap.forEach((userDoc) => {
      const userData = userDoc.data() as any;

      const result = scoreContractorMatch(
        {
          id: userDoc.id,
          ...userData,
        },
        {
          trade,
          location: jobLocation,
        }
      );

      if (!result.matched) return;

      ranked.push({
        contractorId: userDoc.id,
        score: result.score,
        reason: result.reason,
        distanceMiles: result.distanceMiles,
        displayName: userData.displayName || userData.name || "Contractor",
        availability: userData.availability || "offline",
        reputationScore: userData.reputationScore ?? 0,
      });
    });

    ranked.sort((a, b) => b.score - a.score);

    const topRanked = ranked.slice(0, 25);

    // Batched write: one inbox entry per contractor + a job event
    const batch = adminDb.batch();

    for (const contractor of topRanked) {
      const inboxRef = adminDb
        .collection("users").doc(contractor.contractorId)
        .collection("jobInbox").doc();
      batch.set(inboxRef, {
        jobId,
        trade,
        score: contractor.score,
        reason: contractor.reason,
        distanceMiles: contractor.distanceMiles ?? null,
        createdAt: FieldValue.serverTimestamp(),
        status: "new",
      });
    }

    const eventRef = adminDb.collection("jobs").doc(jobId).collection("events").doc();
    batch.set(eventRef, {
      type: "job_broadcasted",
      actorId: "system",
      meta: {
        contractorCount: topRanked.length,
        trade,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      matchedCount: topRanked.length,
      contractors: topRanked,
    });
  } catch (err) {
    console.error("broadcast-job error:", err);

    return NextResponse.json(
      { error: "Broadcast failed" },
      { status: 500 }
    );
  }
}
