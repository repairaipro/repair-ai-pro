import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { notifyContractorInvited } from "@/lib/notif";
import { scoreContractorMatch, type ContractorLike, type JobLocationInput } from "@/lib/matching";

const NEXT_WAVE_SIZE = 10;

function buildJobLocation(location: any): JobLocationInput {
  return {
    zone:    location?.zone     || location?.city || null,
    city:    location?.city     || null,
    zipCode: location?.zipcode  || location?.zipCode || null,
    lat:     location?.coordinates?.lat ?? location?.lat ?? null,
    lng:     location?.coordinates?.lng ?? location?.lng ?? null,
  };
}

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json();

    const jobRef = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = jobSnap.data()!;

    if (job.claimedBy) return NextResponse.json({ stopped: true });

    const trade = job.aiDetectedTrade || job.trade || null;
    const jobLocation = buildJobLocation(job.location);

    // Get contractors already invited
    const invitesSnap = await jobRef.collection("invitations").get();
    const alreadyInvited = new Set(invitesSnap.docs.map((d) => d.data().contractorId));

    const contractorSnap = await adminDb
      .collection("contractors")
      .where("availability", "!=", "offline")
      .get();

    const ranked = contractorSnap.docs
      .map((doc) => {
        const data = doc.data() as ContractorLike;
        const result = scoreContractorMatch(data, { trade, location: jobLocation });
        return { id: doc.id, data, ...result };
      })
      .filter((c) => c.matched && !alreadyInvited.has(c.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, NEXT_WAVE_SIZE);

    if (ranked.length === 0) return NextResponse.json({ done: true });

    const batch = adminDb.batch();

    ranked.forEach((c) => {
      const inviteRef = jobRef.collection("invitations").doc(`contractor_${c.id}`);
      batch.set(inviteRef, {
        contractorId: c.id,
        status: "pending",
        invitedAt: new Date(),
        score: c.score,
        matchReason: c.reason,
        distanceMiles: c.distanceMiles,
        auto: true,
        wave: "next",
      });

      const inboxRef = adminDb
        .collection("contractors")
        .doc(c.id)
        .collection("jobInbox")
        .doc(`${jobId}_${c.id}`);

      batch.set(inboxRef, {
        jobId,
        invitationStatus: "pending",
        invitedAt: new Date(),
        auto: true,
      });
    });

    await batch.commit();

    await jobRef.update({
      matchCount: (job.matchCount || 0) + ranked.length,
    });

    const locationStr =
      (job.location?.zipcode && `ZIP ${job.location.zipcode}`) ||
      (job.location?.city && job.location?.state && `${job.location.city}, ${job.location.state}`) ||
      job.location?.city ||
      'your area';

    Promise.all(
      ranked.map((c) => notifyContractorInvited(c.id, jobId, trade || 'General', locationStr))
    ).catch((e) => console.error("dispatch-next notify error:", e));

    await jobRef.collection("events").add({
      type: "providers_invited",
      actorId: "system",
      createdAt: new Date(),
      meta: { invitedCount: ranked.length, wave: "next" },
    });

    return NextResponse.json({ success: true, invited: ranked.length });
  } catch (err: any) {
    console.error("dispatch-next error:", err);
    return NextResponse.json({ error: err.message || "Dispatch failed" }, { status: 500 });
  }
}
