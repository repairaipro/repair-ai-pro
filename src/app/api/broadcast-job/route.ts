import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { scoreContractorMatch } from "@/lib/matching";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

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

    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
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

    const usersSnap = await getDocs(collection(db, "users"));
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

    for (const contractor of topRanked) {
      await addDoc(collection(db, "users", contractor.contractorId, "jobInbox"), {
        jobId,
        trade,
        score: contractor.score,
        reason: contractor.reason,
        distanceMiles: contractor.distanceMiles ?? null,
        createdAt: serverTimestamp(),
        status: "new",
      });
    }

    await addDoc(collection(db, "jobs", jobId, "events"), {
      type: "job_broadcasted",
      actorId: "system",
      meta: {
        contractorCount: topRanked.length,
        trade,
      },
      createdAt: serverTimestamp(),
    });

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