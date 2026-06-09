import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const decoded = await verifyAuthToken(req).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { description, location, aiDetectedTrade, aiSummary, urgency, isEmergency, emergencyFeeUsd, trade, questionnaireAnswers, smartEstimate, locationPrivacyMode } = body;

    // userId always comes from the verified token — never from the request body
    const userId = decoded.uid;

    if (!description || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ CREATE JOB
    const docRef = await addDoc(collection(db, "jobs"), {
      userId,
      description,
      location,

      status: "triaged",

      aiDetectedTrade: aiDetectedTrade ?? null,
      aiSummary: aiSummary ?? null,

      urgency: urgency ?? "flexible",
      isEmergency: isEmergency ?? false,
      emergencyFeeUsd: emergencyFeeUsd ?? 0,
      trade: trade ?? aiDetectedTrade ?? null,

      // Location privacy mode (controls what contractors see)
      locationPrivacyMode: locationPrivacyMode ?? 'full',

      // Questionnaire answers for better contractor matching
      questionnaireAnswers: questionnaireAnswers ?? null,

      // Smart estimate from pricing history
      ...(smartEstimate ? {
        estimatedCost: {
          typical:    smartEstimate.estimatedPrice,
          low:        smartEstimate.lowRange,
          high:       smartEstimate.highRange,
          complexity: smartEstimate.complexity,
          sampleSize: smartEstimate.sampleSize,
          source:     'smart_estimate',
        },
      } : {}),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const newJobId = docRef.id;

    // 🔥 AUTO INVITE (non-blocking, won't crash job creation)
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
      // ❗ Don't throw — job should still be created
    }

    return NextResponse.json({ jobId: newJobId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to create job" },
      { status: 500 }
    );
  }
}