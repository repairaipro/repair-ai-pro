import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

const ADMIN_UIDS = (process.env.ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

async function isAdmin(req: Request): Promise<boolean> {
  try {
    const header  = req.headers.get("authorization") ?? "";
    const token   = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return false;
    const decoded = await adminAuth.verifyIdToken(token);
    return ADMIN_UIDS.includes(decoded.uid) || (decoded.email?.endsWith("@repair-ai.admin") ?? false);
  } catch { return false; }
}

/**
 * GET /api/admin/payouts
 *
 * Aggregates payout state across all released-payment jobs:
 *  - transferred: successfully paid out to contractor's Connect account
 *  - pending: released but contractor has no verified Connect account
 *    (needs manual follow-up — money sits on the platform account)
 *  - failed: Stripe transfer errored (needs manual retry/investigation)
 *
 * Also computes platform fee revenue (total released minus total payouts).
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const jobsSnap = await adminDb
      .collection("jobs")
      .where("paymentStatus", "==", "released")
      .orderBy("paymentReleasedAt", "desc")
      .limit(200)
      .get();

    let totalReleased = 0;
    let totalPaidOut = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let transferredCount = 0;

    const contractorIds = new Set<string>();
    const rows: any[] = [];

    jobsSnap.docs.forEach((doc) => {
      const job = doc.data();
      totalReleased += job.paymentAmountUsd ?? 0;
      totalPaidOut += job.payoutAmount ?? 0;

      if (job.payoutStatus === "transferred") transferredCount++;
      else if (job.payoutStatus === "failed") failedCount++;
      else if (job.payoutStatus === "pending") pendingCount++;

      if (job.claimedBy) contractorIds.add(job.claimedBy);

      rows.push({
        jobId: doc.id,
        description: (job.description ?? "").slice(0, 60),
        contractorId: job.claimedBy ?? null,
        totalAmount: job.paymentAmountUsd ?? 0,
        payoutAmount: job.payoutAmount ?? 0,
        payoutStatus: job.payoutStatus ?? "unknown",
        releasedAt: job.paymentReleasedAt?.toDate?.()?.toISOString() ?? null,
      });
    });

    // Resolve contractor names for display
    const contractorNames: Record<string, string> = {};
    await Promise.all(
      Array.from(contractorIds).map(async (id) => {
        const snap = await adminDb.collection("contractors").doc(id).get();
        contractorNames[id] = snap.data()?.name ?? "Unknown";
      })
    );

    const enrichedRows = rows.map((r) => ({
      ...r,
      contractorName: r.contractorId ? contractorNames[r.contractorId] ?? "Unknown" : "—",
    }));

    return NextResponse.json({
      totalReleased,
      totalPaidOut,
      platformRevenue: totalReleased - totalPaidOut,
      transferredCount,
      pendingCount,
      failedCount,
      rows: enrichedRows,
    });
  } catch (err: any) {
    console.error("admin payouts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
