import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      jobId,
      customerId,
      providerIds,
    } = body ?? {};

    if (!jobId || !customerId || !Array.isArray(providerIds) || providerIds.length === 0) {
      return NextResponse.json(
        { error: "Missing jobId, customerId, or providerIds" },
        { status: 400 }
      );
    }

    const jobRef = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const job = jobSnap.data() as any;

    if (job.userId !== customerId) {
      return NextResponse.json(
        { error: "Only the job owner can send invitations" },
        { status: 403 }
      );
    }

    const invitationsRef = jobRef.collection("invitations");
    const invited: string[] = [];

    for (const provider of providerIds) {
      const providerId = provider.id;
      const providerType = provider.providerType || "contractor";

      if (!providerId) continue;

      const invitationRef = invitationsRef.doc(`${providerType}_${providerId}`);

      await invitationRef.set({
        providerId,
        providerType,
        status: "pending",
        invitedBy: customerId,
        createdAt: FieldValue.serverTimestamp(),
        displayName: provider.displayName || null,
        score: provider.score ?? null,
        distanceMiles: provider.distanceMiles ?? null,
      });

      /* Optional inbox fanout */

      if (providerType === "contractor") {
        await adminDb
          .collection("contractors")
          .doc(providerId)
          .collection("jobInbox")
          .add({
            jobId,
            invitationStatus: "pending",
            invitedAt: FieldValue.serverTimestamp(),
            createdBy: customerId,
            source: "customer_invite",
          });
      }

      if (providerType === "business") {
        await adminDb
          .collection("businesses")
          .doc(providerId)
          .collection("jobInbox")
          .add({
            jobId,
            invitationStatus: "pending",
            invitedAt: FieldValue.serverTimestamp(),
            createdBy: customerId,
            source: "customer_invite",
          });
      }

      invited.push(`${providerType}:${providerId}`);
    }

    await jobRef.collection("events").add({
      type: "providers_invited",
      actorId: customerId,
      message: "Customer invited providers",
      meta: {
        invitedCount: invited.length,
        invited,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      invitedCount: invited.length,
      invited,
    });
  } catch (err: any) {
    console.error("invite-providers error:", err);

    return NextResponse.json(
      { error: err.message || "Failed to invite providers" },
      { status: 500 }
    );
  }
}