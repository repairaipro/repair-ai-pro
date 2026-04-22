import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyJobAccepted } from "@/lib/notif";

async function getUidFromAuthHeader(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) throw new Error("Missing auth token");

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

export async function POST(req: Request) {
  try {
    const uid = await getUidFromAuthHeader(req);
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const jobRef = adminDb.collection("jobs").doc(jobId);
    const contractorRef = adminDb.collection("contractors").doc(uid);
    const invitationId = `contractor_${uid}`;
    const invitationRef = jobRef.collection("invitations").doc(invitationId);

    await adminDb.runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef);

      if (!jobSnap.exists) {
        throw new Error("Job not found");
      }

      const job = jobSnap.data() as any;

      if (job.claimedBy) {
        throw new Error("Job already claimed");
      }

      const invitationSnap = await tx.get(invitationRef);

      if (!invitationSnap.exists) {
        throw new Error("Invitation not found");
      }

      const invitation = invitationSnap.data() as any;

      if (invitation.status !== "pending") {
        throw new Error(`Invitation already ${invitation.status}`);
      }

      tx.set(
        contractorRef,
        {
          uid,
          jobsAccepted: FieldValue.increment(1),
          invitationAcceptCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
          lastActiveAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.update(jobRef, {
        claimedBy: uid,
        status: "accepted",
        acceptedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(invitationRef, {
        status: "accepted",
        acceptedAt: FieldValue.serverTimestamp(),
      });
    });

    const allInvites = await jobRef.collection("invitations").get();
    const batch = adminDb.batch();

    allInvites.forEach((docSnap) => {
      if (docSnap.id === invitationId) return;

      const data = docSnap.data();

      if (data.status === "pending") {
        batch.update(docSnap.ref, {
          status: "closed",
          closedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    await batch.commit();

    const inboxSnap = await adminDb
      .collection("contractors")
      .doc(uid)
      .collection("jobInbox")
      .where("jobId", "==", jobId)
      .get();

    const inboxBatch = adminDb.batch();

    inboxSnap.forEach((docSnap) => {
      inboxBatch.update(docSnap.ref, {
        invitationStatus: "accepted",
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await inboxBatch.commit();

    await jobRef.collection("events").add({
      type: "invitation_accepted",
      actorId: uid,
      createdAt: FieldValue.serverTimestamp(),
      meta: { contractorId: uid },
    });

    // Notify the homeowner
    try {
      const jobSnap = await jobRef.get();
      const job = jobSnap.data() as any;
      const contractorSnap = await adminDb.collection("contractors").doc(uid).get();
      const contractorName = contractorSnap.data()?.name || "A contractor";
      await notifyJobAccepted(job.userId, jobId, contractorName);
    } catch (e) {
      console.error("Failed to send job_accepted notification:", e);
    }

    return NextResponse.json({
      success: true,
      jobId,
      claimedBy: uid,
    });
  } catch (err: any) {
    console.error("accept-invitation error:", err);

    return NextResponse.json(
      { error: err.message || "Failed to accept invitation" },
      { status: 500 }
    );
  }
}