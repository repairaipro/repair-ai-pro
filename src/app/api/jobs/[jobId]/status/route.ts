import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const { status, contractorId } = await req.json();

    if (!status || !contractorId) {
      return NextResponse.json(
        { error: "Missing status or contractorId" },
        { status: 400 }
      );
    }

    const jobRef = doc(db, "jobs", jobId);
    const snap = await getDoc(jobRef);

    if (!snap.exists()) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = snap.data();

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

    await updateDoc(jobRef, {
      status,
      updatedAt: serverTimestamp(),
      ...(status === "completed"
        ? { completedAt: serverTimestamp() }
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
