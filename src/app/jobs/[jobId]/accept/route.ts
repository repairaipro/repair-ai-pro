import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { contractorId } = await req.json();
    const { jobId } = params;

    if (!contractorId) {
      return NextResponse.json(
        { error: "Missing contractorId" },
        { status: 400 }
      );
    }

    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data();

    // 🔒 Guardrails
    if (job.status === "accepted") {
      return NextResponse.json(
        { error: "Job already accepted" },
        { status: 409 }
      );
    }

    if (job.status !== "matched" && job.status !== "triaged") {
      return NextResponse.json(
        { error: "Job not eligible for acceptance" },
        { status: 400 }
      );
    }

    await updateDoc(jobRef, {
      status: "accepted",
      claimedBy: contractorId,
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
