import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Identity comes from the verified token — never from the request body
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const contractorId = decoded.uid;

    const { status } = await req.json();

    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    const jobRef = adminDb.collection("jobs").doc(jobId);
    const snap = await jobRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = snap.data()!;

    // 🔐 Guardrails
    if (job.claimedBy !== contractorId) {
      return NextResponse.json(
        { error: "Unauthorized contractor" },
        { status: 403 }
      );
    }

    const allowedTransitions: Record<string, string[]> = {
      accepted: ["in_progress"],
      in_progress: ["completed"],
    };

    const current = job.status;
    const allowed = allowedTransitions[current] || [];

    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid transition from ${current} to ${status}` },
        { status: 400 }
      );
    }

    await jobRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      ...(status === "completed"
        ? { completedAt: FieldValue.serverTimestamp() }
        : {}),
    });

    return NextResponse.json({ ok: true, status });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
