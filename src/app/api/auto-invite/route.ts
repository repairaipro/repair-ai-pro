import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { notifyContractorInvited } from "@/lib/notif";

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

async function getUid(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) throw new Error("No token");

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

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

    const job = jobSnap.data();

    // 🔥 get all contractors
    const contractorSnap = await adminDb.collection("contractors").get();

    const ranked = contractorSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        score: score(data, job),
      };
    });

    // 🔥 sort best → worst
    ranked.sort((a, b) => b.score - a.score);

    const top = ranked.slice(0, 5);

    const batch = adminDb.batch();

    top.forEach((c) => {
      const invitationId = `contractor_${c.id}`;

      const inviteRef = jobRef
        .collection("invitations")
        .doc(invitationId);

      batch.set(inviteRef, {
        contractorId: c.id,
        status: "pending",
        invitedAt: new Date(),
        score: c.score,
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

    // Notify each invited contractor (fire-and-forget)
    const trade = job?.aiDetectedTrade || job?.trade || "General";
    const city  = job?.location?.city  || job?.location || "your area";
    Promise.all(
      top.map((c) => notifyContractorInvited(c.id, jobId, trade, city))
    ).catch((e) => console.error("Invite notifications error:", e));

    // 🔥 timeline
    await jobRef.collection("events").add({
      type: "providers_invited",
      actorId: uid,
      createdAt: new Date(),
      meta: {
        invitedCount: top.length,
        auto: true,
        wave: "initial",
      },
    });

    // ⏱️ 🔥 TRIGGER NEXT WAVE (IMPORTANT)
    setTimeout(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/dispatch-next`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId }),
        });
      } catch (err) {
        console.error("dispatch-next trigger failed:", err);
      }
    }, 1000 * 60 * 2); // 2 minutes

    return NextResponse.json({
      success: true,
      invited: top.length,
    });
  } catch (err: any) {
    console.error("auto-invite error:", err);

    return NextResponse.json(
      { error: err.message || "Auto invite failed" },
      { status: 500 }
    );
  }
}