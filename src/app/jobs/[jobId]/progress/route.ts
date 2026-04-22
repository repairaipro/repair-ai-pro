import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      userId,
      description,
      location,
      aiDetectedTrade,
      aiSummary,
    } = body;

    if (!userId || !description || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ CREATE JOB (server-safe)
    const docRef = await adminDb.collection("jobs").add({
      userId,
      description,
      location,

      status: "triaged",

      aiDetectedTrade: aiDetectedTrade ?? null,
      aiSummary: aiSummary ?? null,

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newJobId = docRef.id;

    // 🔥 AUTO INVITE
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auto-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("authorization") || "",
        },
        body: JSON.stringify({ jobId: newJobId }),
      });
    } catch (err) {
      console.error("Auto-invite failed:", err);
    }

    return NextResponse.json({ jobId: newJobId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to create job" },
      { status: 500 }
    );
  }
}