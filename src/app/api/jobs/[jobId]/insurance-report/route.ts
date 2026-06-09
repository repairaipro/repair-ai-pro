import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe";

const REPORT_FEE_CENTS = 4900; // $49.00

/**
 * POST /api/jobs/[jobId]/insurance-report
 *
 * Two-step flow:
 *   1. Call with empty body → returns {requiresPayment: true, clientSecret, amountUsd: 49}
 *   2. Frontend confirms payment with Stripe, then call again with {paymentIntentId} →
 *      verifies payment, generates AI report, saves to Firestore, returns report
 *
 * Auth: Bearer token (homeowner who owns the job)
 */
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

    // ── Load job ──────────────────────────────────────────────────────────
    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const job = jobSnap.data()!;

    if (job.userId !== uid) {
      return NextResponse.json(
        { error: "You do not have permission to generate a report for this job" },
        { status: 403 }
      );
    }

    // ── Parse body ────────────────────────────────────────────────────────
    let body: { paymentIntentId?: string } = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }

    // ── If report already generated, return it immediately ────────────────
    if (job.insuranceReport?.content && !body.paymentIntentId) {
      return NextResponse.json({ report: job.insuranceReport.content, alreadyGenerated: true });
    }

    // ── Step 1: No paymentIntentId → create PaymentIntent ─────────────────
    if (!body.paymentIntentId) {
      // Get or create Stripe customer
      let customerId: string = job.stripeCustomerId ?? "";
      if (!customerId) {
        const userRecord = await adminAuth.getUser(uid);
        const customer = await stripe.customers.create({
          email:    userRecord.email ?? undefined,
          name:     userRecord.displayName ?? undefined,
          metadata: { uid },
        });
        customerId = customer.id;
        await jobRef.update({ stripeCustomerId: customerId });
      }

      const intent = await stripe.paymentIntents.create({
        amount:             REPORT_FEE_CENTS,
        currency:           "usd",
        customer:           customerId,
        description:        `Insurance report for job: ${job.description?.slice(0, 80) ?? jobId}`,
        setup_future_usage: "off_session",
        metadata: { jobId, homeownerId: uid, type: "insurance_report" },
      });

      return NextResponse.json({
        requiresPayment: true,
        clientSecret:    intent.client_secret,
        amountUsd:       REPORT_FEE_CENTS / 100,
      });
    }

    // ── Step 2: Verify payment ─────────────────────────────────────────────
    const intent = await stripe.paymentIntents.retrieve(body.paymentIntentId);

    if (intent.metadata?.jobId !== jobId || intent.metadata?.homeownerId !== uid) {
      return NextResponse.json({ error: "Payment does not match this job" }, { status: 403 });
    }

    if (intent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment not confirmed (status: ${intent.status})` },
        { status: 402 }
      );
    }

    // ── Generate report ────────────────────────────────────────────────────
    const locationStr =
      typeof job.location === "string"
        ? job.location
        : job.location?.city ?? "Not specified";

    const jobCompleted =
      job.status === "confirmed" || job.status === "verified" ? "Yes" : "Pending";

    const completion = await openai.chat.completions.create({
      model:    "gpt-4o",
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role:    "system",
          content: "You are an expert home repair damage assessor. Generate a professional insurance claim report in markdown format.",
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
    });

    const reportContent = completion.choices[0]?.message?.content ?? "Report generation failed.";

    // ── Save report ────────────────────────────────────────────────────────
    const generatedAt = FieldValue.serverTimestamp();
    await jobRef.update({
      insuranceReport: {
        content:           reportContent,
        generatedAt,
        generatedBy:       uid,
        paymentIntentId:   body.paymentIntentId,
        reportFeeUsd:      REPORT_FEE_CENTS / 100,
      },
      updatedAt: generatedAt,
    });

    return NextResponse.json({ report: reportContent, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    const errorMessage = await handleOpenAIError(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
