import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendJobMatchedEmail } from "@/lib/email";
import { trackEvent } from "@/lib/funnel";
import { sendSMS } from "@/lib/sms";

/**
 * STEP B1 — Job Acceptance Enforcement
 *
 * Rules enforced:
 * - Contractor must be authenticated
 * - contractorId === auth.uid
 * - verificationTier >= 2
 * - riskScore < 70
 * - Job must be in "matched" status
 */
export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    /* ---------------- AUTH ---------------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const contractorId = decoded.uid;

    /* ---------------- LOAD CONTRACTOR ---------------- */
    const contractorRef = adminDb.doc(`contractors/${contractorId}`);
    const contractorSnap = await contractorRef.get();

    if (!contractorSnap.exists) {
      return NextResponse.json(
        { error: "Contractor profile not found" },
        { status: 404 }
      );
    }

    const contractor = contractorSnap.data() as any;

    const verificationTier = Number(contractor.verificationTier ?? 0);
    const riskScore = Number(contractor.riskScore ?? 100);
    const suspended = contractor.suspended === true;

    /* ---------------- ENFORCEMENT ---------------- */
    if (suspended) {
      await logRiskEvent(contractorId, "SUSPENDED_ATTEMPT", params.jobId);
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }

    if (verificationTier < 2) {
      await logRiskEvent(contractorId, "LOW_VERIFICATION_TIER", params.jobId);
      return NextResponse.json(
        { error: "Verification required to accept jobs" },
        { status: 403 }
      );
    }

    if (riskScore >= 70) {
      await logRiskEvent(contractorId, "HIGH_RISK_SCORE", params.jobId);
      return NextResponse.json(
        { error: "Account flagged for risk review" },
        { status: 403 }
      );
    }

    /* ---------------- LOAD JOB ---------------- */
    const jobRef = adminDb.doc(`jobs/${params.jobId}`);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const job = jobSnap.data() as any;

    if (job.status !== "matched") {
      return NextResponse.json(
        { error: "Job is not available for acceptance" },
        { status: 409 }
      );
    }

    /* ---------------- ACCEPT JOB ---------------- */
    await jobRef.update({
      status: "claimed",
      claimedBy: contractorId,
      claimedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    trackEvent("job_claimed", { jobId: params.jobId, contractorId });

    /* ---------------- AUDIT LOG ---------------- */
    await adminDb.collection("jobAcceptanceLogs").add({
      jobId: params.jobId,
      contractorId,
      acceptedAt: FieldValue.serverTimestamp(),
      verificationTier,
      riskScore,
    });

    /* ---------------- EMAIL HOMEOWNER ---------------- */
    try {
      const homeownerAuth = await getAuth().getUser(job.userId);
      if (homeownerAuth.email) {
        await sendJobMatchedEmail(homeownerAuth.email, {
          jobDescription:  (job.description ?? "").slice(0, 80),
          tradeType:       job.aiDetectedTrade ?? job.trade ?? "General",
          contractorName:  contractor.name ?? "Your contractor",
          jobId:           params.jobId,
        });
      }
    } catch { /* non-blocking */ }

    /* ---------------- SMS HOMEOWNER ---------------- */
    try {
      const contractorName = contractor.name ?? "Your contractor";
      const trade = job.aiDetectedTrade ?? job.trade ?? "repair";
      await sendSMS(job.userId, {
        title: "🎉 Contractor matched!",
        body:  `${contractorName} accepted your ${trade} job. Tap to chat.`,
        link:  `/jobs/${params.jobId}`,
      });
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      jobId: params.jobId,
      status: "claimed",
    });
  } catch (err: any) {
    console.error("JOB ACCEPT ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ---------------- HELPERS ---------------- */

async function logRiskEvent(
  contractorId: string,
  reason: string,
  jobId?: string
) {
  await adminDb.collection("riskEvents").add({
    contractorId,
    jobId: jobId || null,
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}
