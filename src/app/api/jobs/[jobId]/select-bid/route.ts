import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { sendSMS } from "@/lib/sms";
import { createNotification } from "@/lib/notif";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Auth: Bearer token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // 2. Load job — verify caller is the homeowner
    const jobRef = adminDb.collection("jobs").doc(params.jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data()!;

    if (job.userId !== uid) {
      return NextResponse.json(
        { error: "Only the homeowner can select a bid" },
        { status: 403 }
      );
    }

    // 3. Parse body
    const body = await req.json();
    const contractorId: string | undefined = body.contractorId;

    if (!contractorId) {
      return NextResponse.json(
        { error: "contractorId is required" },
        { status: 400 }
      );
    }

    // 4. Verify bid exists and is pending
    const winningBidRef = adminDb
      .collection("jobs")
      .doc(params.jobId)
      .collection("bids")
      .doc(contractorId);

    const winningBidSnap = await winningBidRef.get();

    if (!winningBidSnap.exists) {
      return NextResponse.json(
        { error: "Bid not found for this contractor" },
        { status: 404 }
      );
    }

    const winningBidData = winningBidSnap.data()!;

    if (winningBidData.status !== "pending") {
      return NextResponse.json(
        { error: "Bid is no longer pending" },
        { status: 409 }
      );
    }

    // 5. Firestore transaction
    await adminDb.runTransaction(async (tx) => {
      // Fetch all bids inside the transaction
      const bidsSnap = await tx.get(
        adminDb
          .collection("jobs")
          .doc(params.jobId)
          .collection("bids")
      );

      // a. Update winning bid to "selected"
      tx.update(winningBidRef, { status: "selected" });

      // b. Update all other bids to "declined"
      bidsSnap.docs.forEach((bidDoc) => {
        if (bidDoc.id !== contractorId) {
          tx.update(bidDoc.ref, { status: "declined" });
        }
      });

      // c. Update job doc
      tx.update(jobRef, {
        status: "accepted",
        claimedBy: contractorId,
        claimedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // 6. Non-blocking: notify winning + declined contractors
    const winningBid = winningBidData;
    const jobDescription = (job.description ?? "this job").slice(0, 60);

    // Notify winner
    Promise.all([
      createNotification({
        recipientId: contractorId,
        type:        "bid_selected" as any,
        title:       "🏆 Your bid was selected!",
        body:        `You won the job: "${jobDescription}". Start coordinating with the homeowner.`,
        jobId:       params.jobId,
        href:        `/jobs/${params.jobId}`,
      }),
      sendSMS(contractorId, {
        title: "🎉 You won the bid!",
        body:  `Your bid was selected for "${jobDescription}". Start chatting now.`,
        link:  `/jobs/${params.jobId}`,
      }),
    ]).catch(() => {});

    // Notify declined contractors (fire-and-forget)
    adminDb.collection("jobs").doc(params.jobId).collection("bids").get()
      .then((bidsSnap) => {
        bidsSnap.docs
          .filter((d) => d.id !== contractorId)
          .forEach((d) => {
            createNotification({
              recipientId: d.id,
              type:        "bid_declined" as any,
              title:       "Another contractor was selected",
              body:        `Your bid on "${jobDescription}" wasn't chosen this time.`,
              jobId:       params.jobId,
              href:        `/contractor-inbox`,
            }).catch(() => {});
          });
      }).catch(() => {});

    // 7. Return success
    return NextResponse.json({ success: true, selectedContractorId: contractorId });
  } catch (err: any) {
    console.error("POST /select-bid error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to select bid" },
      { status: 500 }
    );
  }
}
