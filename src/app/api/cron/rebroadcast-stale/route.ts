import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { notifyContractorInvited } from "@/lib/notif";
import { scoreContractorMatch, type ContractorLike, type JobLocationInput } from "@/lib/matching";

/**
 * GET|POST /api/cron/rebroadcast-stale
 *
 * Win-back automation: jobs sitting in `triaged` for 48h+ with nobody
 * claiming them get a second, wider invite wave (next 10 best contractors
 * who weren't already invited).
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — set CRON_SECRET in env and
 * point a scheduler (Vercel Cron, GitHub Action, Cloud Scheduler) at this
 * endpoint daily.
 */

const STALE_HOURS = 48;
const REBROADCAST_WAVE_SIZE = 10;
const MAX_JOBS_PER_RUN = 20;

function buildJobLocation(location: any): JobLocationInput {
  return {
    zone:    location?.zone     || location?.city || null,
    city:    location?.city     || null,
    zipCode: location?.zipcode  || location?.zipCode || null,
    lat:     location?.coordinates?.lat ?? location?.lat ?? null,
    lng:     location?.coordinates?.lng ?? location?.lng ?? null,
  };
}

async function run(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Find stale triaged jobs ─────────────────────────────────────────────
  const cutoff = new Date(Date.now() - STALE_HOURS * 3600 * 1000);
  const staleSnap = await adminDb
    .collection("jobs")
    .where("status", "==", "triaged")
    .where("createdAt", "<", cutoff)
    .limit(MAX_JOBS_PER_RUN)
    .get();

  let rebroadcasted = 0;
  let skipped = 0;

  for (const jobDoc of staleSnap.docs) {
    const job = jobDoc.data();

    // Only rebroadcast once
    if (job.rebroadcastedAt) { skipped++; continue; }

    const jobRef = jobDoc.ref;
    const trade = job.aiDetectedTrade || job.trade || null;
    const jobLocation = buildJobLocation(job.location);

    // Contractors already invited in earlier waves
    const invitedSnap = await jobRef.collection("invitations").get();
    const alreadyInvited = new Set(invitedSnap.docs.map((d) => d.data().contractorId));

    // Rank the field, excluding prior invitees
    const contractorSnap = await adminDb
      .collection("contractors")
      .where("availability", "!=", "offline")
      .get();

    const wave = contractorSnap.docs
      .map((doc) => {
        const data = doc.data() as ContractorLike;
        const result = scoreContractorMatch(data, { trade, location: jobLocation });
        return { id: doc.id, ...result };
      })
      .filter((c) => c.matched && !alreadyInvited.has(c.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, REBROADCAST_WAVE_SIZE);

    if (wave.length === 0) {
      await jobRef.update({ rebroadcastedAt: new Date(), matchStatus: "no_matches" });
      skipped++;
      continue;
    }

    const batch = adminDb.batch();
    wave.forEach((c) => {
      const inviteRef = jobRef.collection("invitations").doc(`contractor_${c.id}`);
      batch.set(inviteRef, {
        contractorId: c.id,
        status: "pending",
        invitedAt: new Date(),
        score: c.score,
        matchReason: c.reason,
        distanceMiles: c.distanceMiles,
        auto: true,
        wave: "rebroadcast",
      });

      const inboxRef = adminDb
        .collection("contractors").doc(c.id)
        .collection("jobInbox").doc(`${jobDoc.id}_${c.id}`);
      batch.set(inboxRef, {
        jobId: jobDoc.id,
        invitationStatus: "pending",
        invitedAt: new Date(),
        auto: true,
      });
    });

    const eventRef = jobRef.collection("events").doc();
    batch.set(eventRef, {
      type: "providers_invited",
      actorId: "system",
      createdAt: new Date(),
      meta: { invitedCount: wave.length, auto: true, wave: "rebroadcast" },
    });

    batch.update(jobRef, {
      rebroadcastedAt: new Date(),
      matchStatus: "invited",
      matchCount: (job.matchCount ?? 0) + wave.length,
    });

    await batch.commit();

    // Notify contractors (fire-and-forget)
    const locationStr =
      (job.location?.zipcode && `ZIP ${job.location.zipcode}`) ||
      (job.location?.city && job.location?.state && `${job.location.city}, ${job.location.state}`) ||
      (job.location?.city) ||
      "your area";
    Promise.all(
      wave.map((c) => notifyContractorInvited(c.id, jobDoc.id, trade || "General", locationStr))
    ).catch((e) => console.error("Rebroadcast notifications error:", e));

    rebroadcasted++;
  }

  return NextResponse.json({
    success: true,
    scanned: staleSnap.size,
    rebroadcasted,
    skipped,
  });
}

// Vercel Cron sends GET; manual/CI triggers may POST
export async function GET(req: Request)  { return run(req); }
export async function POST(req: Request) { return run(req); }
