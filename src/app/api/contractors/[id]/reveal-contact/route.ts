import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

type Body = {
  jobId: string;
};

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contractorId = params.id;

    // 1) Auth: must be the contractor
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    if (uid !== contractorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Parse body
    const body = (await req.json()) as Body;
    const jobId = body?.jobId?.trim();
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // 3) Load job
    const jobRef = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data() as any;

    // Must be claimed by this contractor
    if (job?.claimedBy !== uid) {
      return NextResponse.json({ error: "Job not claimed by this contractor" }, { status: 403 });
    }

    // 4) Hard gate: proof-of-work must exist
    // We accept either:
    // - at least 1 event in jobs/{jobId}/events, OR
    // - at least 1 attachment in jobs/{jobId}/attachments
    const eventsSnap = await jobRef.collection("events").limit(1).get();
    const attsSnap = await jobRef.collection("attachments").limit(1).get();

    const hasProof = !eventsSnap.empty || !attsSnap.empty;
    if (!hasProof) {
      return NextResponse.json(
        {
          error:
            "Proof-of-work required before revealing contact. Add an attachment or create a timeline event.",
          code: "PROOF_REQUIRED",
        },
        { status: 409 }
      );
    }

    // 5) (Optional) trust check: if you have trustScore/verificationTier fields, enforce them here
    const contractorSnap = await adminDb.collection("contractors").doc(uid).get();
    const contractor = contractorSnap.exists ? (contractorSnap.data() as any) : {};

    const trustScore = Number(contractor?.trustScore ?? 0);
    const verificationTier = String(contractor?.verificationTier ?? "unverified");

    // You can tune these thresholds anytime:
    const minimumTrustScore = 40;
    const allowedTiers = new Set(["verified_basic", "verified_pro", "verified_elite"]);

    const tierOk = allowedTiers.has(verificationTier) || trustScore >= minimumTrustScore;
    if (!tierOk) {
      return NextResponse.json(
        {
          error:
            "Verification required to reveal contact. Increase verification tier or trust score.",
          code: "VERIFICATION_REQUIRED",
        },
        { status: 403 }
      );
    }

    // 6) Load customer contact info (from users/{userId})
    const userId = String(job?.userId || "");
    if (!userId) {
      return NextResponse.json({ error: "Job missing userId" }, { status: 500 });
    }

    const userSnap = await adminDb.collection("users").doc(userId).get();
    const userDoc = userSnap.exists ? (userSnap.data() as any) : {};

    // Decide what you store in users docs:
    const contact = {
      name: String(userDoc?.name ?? userDoc?.displayName ?? "Customer"),
      email: String(userDoc?.email ?? ""),
      phone: String(userDoc?.phone ?? ""),
    };

    // 7) Log reveal (server-only write)
    await adminDb
      .collection("contractors")
      .doc(uid)
      .collection("contactReveals")
      .add({
        jobId,
        userId,
        revealedAt: new Date(),
        verificationTier,
        trustScore,
      });

    // 8) Return contact
    return NextResponse.json({
      ok: true,
      contact,
      meta: { verificationTier, trustScore },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
