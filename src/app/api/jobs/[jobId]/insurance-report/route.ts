import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/jobs/[jobId]/insurance-report
 *
 * Generates a professional insurance claim report for a home repair job
 * using GPT-4o, saves it to Firestore, and returns the content.
 *
 * Auth: Bearer token (homeowner who owns the job)
 */
export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Verify Bearer auth
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const jobId = params.jobId;

    // 2. Fetch job doc
    const jobRef = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data()!;

    // 3. Validate user owns the job
    if (job.userId !== uid) {
      return NextResponse.json(
        { error: "You do not have permission to generate a report for this job" },
        { status: 403 }
      );
    }

    // Resolve location string
    const locationStr =
      typeof job.location === "string"
        ? job.location
        : job.location?.city ?? "Not specified";

    const jobCompleted =
      job.status === "confirmed" || job.status === "verified" ? "Yes" : "Pending";

    // 4. Call OpenAI gpt-4o to generate the insurance report
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert home repair damage assessor. Generate a professional insurance claim report in markdown format.",
        },
        {
          role: "user",
          content: `Generate a detailed insurance claim report for this home repair job:
- Trade/Category: ${job.aiDetectedTrade ?? job.trade ?? "General"}
- Description: ${job.description}
- Severity: ${job.aiSeverity ?? "Unknown"}
- AI Summary: ${job.aiSummary ?? "N/A"}
- Location: ${locationStr}
- Job completed: ${jobCompleted}

Include sections: Executive Summary, Damage Assessment, Repair Scope, Cost Estimate Range, Insurance Claim Justification, Contractor Verification, Recommendations. Be professional and specific.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const reportContent =
      completion.choices[0]?.message?.content ?? "Report generation failed.";

    // 5. TODO: Charge a $49 report fee via Stripe
    // TODO: Create a Stripe PaymentIntent for $49.00 (4900 cents) and confirm it
    //       using the homeowner's saved payment method before saving the report.
    console.log("INSURANCE_REPORT_CHARGE: $49");

    // 6. Save the report to jobs/{jobId}
    const generatedAt = FieldValue.serverTimestamp();

    await jobRef.update({
      insuranceReport: {
        content: reportContent,
        generatedAt,
        generatedBy: uid,
      },
      updatedAt: generatedAt,
    });

    // 7. Return the report
    return NextResponse.json({
      report: reportContent,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    const errorMessage = await handleOpenAIError(err);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
