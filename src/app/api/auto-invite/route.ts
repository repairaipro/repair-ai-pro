import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { notifyContractorInvited } from "@/lib/notif";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function score(contractor: any, job: any) {
  let s = 0;

  if (contractor.trade && job.trade) {
    if (
      contractor.trade.toLowerCase().includes(job.trade.toLowerCase())
    ) {
      s += 40;
    }
  }

  const jobLocation = job.location;
  const contractorLat = contractor.latitude;
  const contractorLon = contractor.longitude;

  if (jobLocation) {
    if (jobLocation.zipcode && contractor.zipcode) {
      if (jobLocation.zipcode === contractor.zipcode) {
        s += 30;
      } else {
        s += 5;
      }
    } else if (contractorLat && contractorLon && jobLocation.coordinates) {
      const distance = haversineDistance(
        contractorLat,
        contractorLon,
        jobLocation.coordinates.lat,
        jobLocation.coordinates.lng
      );
      if (distance <= 10) {
        s += 30;
      } else if (distance <= 25) {
        s += 20;
      } else if (distance <= 50) {
        s += 10;
      }
    } else if (contractor.city && jobLocation.city) {
      if (contractor.city.toLowerCase() === jobLocation.city.toLowerCase()) {
        s += 20;
      }
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
    const location = job?.location || {};
    const locationStr =
      (location.zipcode && `ZIP ${location.zipcode}`) ||
      (location.address && location.address) ||
      (location.city && location.state && `${location.city}, ${location.state}`) ||
      "your area";
    Promise.all(
      top.map((c) => notifyContractorInvited(c.id, jobId, trade, locationStr))
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