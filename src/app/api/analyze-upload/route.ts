import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { analyzeJobInput } from "@/lib/analyzeJobInput";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  const rl = rateLimit(req, "analyze-upload", 15);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const body = await req.json();

    const {
      jobId,
      attachmentUrl,
      text,
      audioUrl,
      videoUrl,
    } = body ?? {};

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId" },
        { status: 400 }
      );
    }

    const result = await analyzeJobInput({
      imageUrl: attachmentUrl,
      text,
      audioUrl,
      videoUrl,
    });

    await adminDb
      .collection("jobs")
      .doc(jobId)
      .update({
        aiIssue: result.issue ?? null,
        aiTrade: result.trade ?? null,
        aiSeverity: result.severity ?? null,
        aiEstimatedCostLow: result.estimatedCostLow ?? null,
        aiEstimatedCostHigh: result.estimatedCostHigh ?? null,
        aiEstimatedTimeMinutes: result.estimatedTimeMinutes ?? null,
        aiJobDescription: result.summary ?? null,
        aiAnalyzedAt: FieldValue.serverTimestamp(),
      });

    await adminDb
      .collection("jobs")
      .doc(jobId)
      .collection("events")
      .add({
        type: "ai_analysis_generated",
        actorId: "system_ai",
        message: "AI analyzed the job",
        meta: result,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      analysis: result,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      { error: err.message || "AI analysis failed" },
      { status: 500 }
    );
  }
}