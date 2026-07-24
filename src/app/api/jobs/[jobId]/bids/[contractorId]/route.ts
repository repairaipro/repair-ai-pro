import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { jobId: string; contractorId: string } }
) {
  try {
    // 1. Auth: Bearer token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // 2. Load job to verify caller is homeowner or the contractor whose bid it is
    const jobRef = adminDb.collection("jobs").doc(params.jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data()!;
    const isHomeowner = job.userId === uid;
    const isBidOwner = uid === params.contractorId;

    if (!isHomeowner && !isBidOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch the bid doc
    const bidSnap = await adminDb
      .collection("jobs")
      .doc(params.jobId)
      .collection("bids")
      .doc(params.contractorId)
      .get();

    if (!bidSnap.exists) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    // 4. Return the bid doc
    return NextResponse.json({ bid: bidSnap.data() });
  } catch (err: any) {
    console.error("GET /bids/[contractorId] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch bid" },
      { status: 500 }
    );
  }
}
