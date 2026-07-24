import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyNewMessage } from "@/lib/notif";

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid     = decoded.uid;
    const jobId   = params.jobId;

    const { text } = await req.json();
    const trimmed = String(text ?? "").trim().slice(0, 2000);
    if (!trimmed) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // ── Load job ──────────────────────────────────────────────────────────
    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = jobSnap.data()!;

    // Must be a participant
    if (job.userId !== uid && job.claimedBy !== uid) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // ── Write message ─────────────────────────────────────────────────────
    await adminDb.collection("jobs").doc(jobId).collection("messages").add({
      text: trimmed,
      senderId: uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    // ── Notify the other party ────────────────────────────────────────────
    const recipientId = uid === job.userId ? job.claimedBy : job.userId;

    if (recipientId) {
      // Get sender's display name
      let senderName = "Someone";
      try {
        const userRecord = await adminAuth.getUser(uid);
        senderName = userRecord.displayName || userRecord.email?.split("@")[0] || "Someone";
      } catch { /* non-fatal */ }

      notifyNewMessage(recipientId, jobId, senderName).catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("send-message error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
