import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

async function getUidFromAuthHeader(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    throw new Error("Missing auth token");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const uid = await getUidFromAuthHeader(req);
    const body = await req.json();
    const { jobId } = body ?? {};

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId" },
        { status: 400 }
      );
    }

    const jobRef = adminDb.collection("jobs").doc(jobId);
    const contractorRef = adminDb.collection("contractors").doc(uid);
    const invitationId = `contractor_${uid}`;
    const invitationRef = jobRef.collection("invitations").doc(invitationId);
    const invitationSnap = await invitationRef.get();

    if (!invitationSnap.exists) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const invitation = invitationSnap.data() as any;

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Invitation is already ${invitation.status}` },
        { status: 409 }
      );
    }

    await invitationRef.update({
      status: "declined",
      declinedAt: FieldValue.serverTimestamp(),
    });

    await contractorRef.set(
      {
        uid,
        invitationDeclineCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
        lastActiveAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const inboxSnap = await adminDb
      .collection("contractors")
      .doc(uid)
      .collection("jobInbox")
      .where("jobId", "==", jobId)
      .get();

    const batch = adminDb.batch();

    inboxSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        invitationStatus: "declined",
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    await jobRef.collection("events").add({
      type: "invitation_declined",
      actorId: uid,
      message: "Contractor declined invitation",
      meta: {
        contractorId: uid,
        invitationId,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      jobId,
      status: "declined",
    });
  } catch (err: any) {
    console.error("decline-invitation error:", err);

    return NextResponse.json(
      { error: err.message || "Failed to decline invitation" },
      { status: 500 }
    );
  }
}