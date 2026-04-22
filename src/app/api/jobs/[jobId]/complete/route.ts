import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { contractorId, summary, attachments = [] } = await req.json();
    const jobId = params.jobId;

    if (!contractorId) {
      return NextResponse.json(
        { error: "Missing contractorId" },
        { status: 400 }
      );
    }

    // 1️⃣ Update job status
    await updateDoc(doc(db, "jobs", jobId), {
      status: "awaiting_confirmation",
      updatedAt: serverTimestamp(),
    });

    // 2️⃣ Create completion draft
    await setDoc(doc(db, "jobs", jobId, "completion", "record"), {
      completedBy: contractorId,
      completedAt: serverTimestamp(),
      summary: summary || "",
      attachments,
      status: "pending_confirmation",
    });

    // 3️⃣ Timeline event
    await setDoc(
      doc(db, "jobs", jobId, "timeline", `completed_${Date.now()}`),
      {
        type: "job_completed",
        actor: contractorId,
        createdAt: serverTimestamp(),
      }
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to complete job" },
      { status: 500 }
    );
  }
}
