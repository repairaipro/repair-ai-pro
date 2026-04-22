import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/* 🔢 scoring (same logic) */
function score(contractor: any, job: any) {
  let s = 0;

  if (contractor.trade && job.trade) {
    if (
      contractor.trade.toLowerCase().includes(job.trade.toLowerCase())
    ) {
      s += 40;
    }
  }

  if (contractor.city && job.location?.city) {
    if (
      contractor.city.toLowerCase() === job.location.city.toLowerCase()
    ) {
      s += 25;
    }
  }

  s += (contractor.rating || 0) * 5;
  s += Math.min(contractor.jobsCompleted || 0, 50) * 0.5;

  const accepted = contractor.invitationAcceptCount || 0;
  const declined = contractor.invitationDeclineCount || 0;
  const total = accepted + declined;

  if (total > 0) {
    s += (accepted / total) * 20;
  }

  return s;
}

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json();

    const jobRef = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data();

    // 🛑 STOP if already claimed
    if (job?.claimedBy) {
      return NextResponse.json({ stopped: true });
    }

    // 🔍 get already invited contractors
    const invitesSnap = await jobRef.collection("invitations").get();
    const alreadyInvited = new Set(
      invitesSnap.docs.map((d) => d.data().contractorId)
    );

    // 🔥 get all contractors
    const contractorSnap = await adminDb.collection("contractors").get();

    const ranked = contractorSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          score: score(data, job),
        };
      })
      .filter((c) => !alreadyInvited.has(c.id)); // exclude already invited

    ranked.sort((a, b) => b.score - a.score);

    const nextBatch = ranked.slice(0, 5);

    if (nextBatch.length === 0) {
      return NextResponse.json({ done: true });
    }

    const batch = adminDb.batch();

    nextBatch.forEach((c) => {
      const inviteRef = jobRef
        .collection("invitations")
        .doc(`contractor_${c.id}`);

      batch.set(inviteRef, {
        contractorId: c.id,
        status: "pending",
        invitedAt: new Date(),
        score: c.score,
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

    // 📝 timeline
    await jobRef.collection("events").add({
      type: "providers_invited",
      actorId: "system",
      createdAt: new Date(),
      meta: {
        invitedCount: nextBatch.length,
        wave: "next",
      },
    });

    return NextResponse.json({
      success: true,
      invited: nextBatch.length,
    });
  } catch (err: any) {
    console.error("dispatch-next error:", err);

    return NextResponse.json(
      { error: err.message || "Dispatch failed" },
      { status: 500 }
    );
  }
}