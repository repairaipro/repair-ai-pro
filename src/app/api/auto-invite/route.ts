import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { notifyContractorInvited } from "@/lib/notif";
import { trackEvent } from "@/lib/funnel";
import { scoreContractorMatch, type ContractorLike, type JobLocationInput } from "@/lib/matching";

const INITIAL_WAVE_SIZE = 10;

function buildJobLocation(location: any): JobLocationInput {
  return {
    zone:    location?.zone     || location?.city || null,
    city:    location?.city     || null,
    zipCode: location?.zipcode  || location?.zipCode || null,
    lat:     location?.coordinates?.lat ?? location?.lat ?? null,
    lng:     location?.coordinates?.lng ?? location?.lng ?? null,
  };
}

async function getUid(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("No token");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const uid = await getUid(req);
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const jobRef = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data()!;
    const trade = job.aiDetectedTrade || job.trade || null;
    const jobLocation = buildJobLocation(job.location);

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
      .filter((c) => c.matched)
      .sort((a, b) => b.score - a.score)
      .slice(0, INITIAL_WAVE_SIZE);

    // Homeowner explicitly requested a quote from this contractor — invite them
    // first regardless of automatic ranking
    const preferredId = job.preferredContractorId as string | undefined | null;
    if (preferredId && !ranked.some((c) => c.id === preferredId)) {
      const prefSnap = await adminDb.collection("contractors").doc(preferredId).get();
      if (prefSnap.exists) {
        ranked.unshift({
          id: preferredId,
          data: prefSnap.data() as ContractorLike,
          matched: true,
          score: 100,
          reason: "Requested by homeowner",
          distanceMiles: null,
        } as any);
      }
    }

    if (ranked.length === 0) {
      // No matches — record this so homeowner UI can show it
      await jobRef.update({ matchStatus: 'no_matches', matchedAt: new Date() });
      return NextResponse.json({ success: true, invited: 0 });
    }

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
        wave: "initial",
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

    // Update job with match summary
    await jobRef.update({
      matchStatus: 'invited',
      matchedAt: new Date(),
      matchCount: ranked.length,
    });

    trackEvent("contractors_invited", { jobId, count: ranked.length, wave: "initial" });

    // Notify (fire-and-forget)
    const locationStr =
      (job.location?.zipcode && `ZIP ${job.location.zipcode}`) ||
      (job.location?.city && job.location?.state && `${job.location.city}, ${job.location.state}`) ||
      (job.location?.city) ||
      'your area';

    Promise.all(
      ranked.map((c) => notifyContractorInvited(c.id, jobId, trade || 'General', locationStr))
    ).catch((e) => console.error("Invite notifications error:", e));

    await jobRef.collection("events").add({
      type: "providers_invited",
      actorId: uid,
      createdAt: new Date(),
      meta: { invitedCount: ranked.length, auto: true, wave: "initial" },
    });

    // Trigger second wave in 3 minutes if no one accepts
    setTimeout(async () => {
      try {
        const updated = await jobRef.get();
        if (!updated.data()?.claimedBy) {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/dispatch-next`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          });
        }
      } catch (err) {
        console.error("dispatch-next trigger failed:", err);
      }
    }, 1000 * 60 * 3);

    return NextResponse.json({ success: true, invited: ranked.length });
  } catch (err: any) {
    console.error("auto-invite error:", err);
    return NextResponse.json({ error: err.message || "Auto invite failed" }, { status: 500 });
  }
}
