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

const STAGES = [
  "diagnosis_run",
  "job_posted",
  "contractors_invited",
  "bid_submitted",
  "job_claimed",
  "job_completed",
  "job_confirmed",
] as const;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

/**
 * GET /api/admin/funnel?days=30
 *
 * The marketplace dashboard that matters:
 * - stage counts + stage-to-stage conversion
 * - NORTH STAR: time from job_posted → first bid_submitted per job
 *   (median + p75, in minutes). Under 15 min median = the marketplace is alive.
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
    const cutoff = new Date(Date.now() - days * 86_400_000);

    const snap = await adminDb
      .collection("analyticsEvents")
      .where("at", ">=", cutoff)
      .orderBy("at", "asc")
      .limit(10_000)
      .get();

    const counts: Record<string, number> = Object.fromEntries(STAGES.map((s) => [s, 0]));

    // Per-job timing: job_posted time and first bid / first claim time
    const postedAt   = new Map<string, number>();
    const firstBidAt = new Map<string, number>();
    const claimedAt  = new Map<string, number>();

    for (const doc of snap.docs) {
      const e = doc.data();
      const type = e.type as string;
      if (type in counts) counts[type] += 1;

      const jobId = e.meta?.jobId as string | undefined;
      const t = e.at?.toDate?.()?.getTime();
      if (!jobId || !t) continue;

      if (type === "job_posted" && !postedAt.has(jobId)) postedAt.set(jobId, t);
      if (type === "bid_submitted" && !firstBidAt.has(jobId)) firstBidAt.set(jobId, t);
      if (type === "job_claimed" && !claimedAt.has(jobId)) claimedAt.set(jobId, t);
    }

    // Time-to-first-bid (minutes) for jobs that got a bid
    const ttfb: number[] = [];
    for (const [jobId, posted] of postedAt) {
      const bid = firstBidAt.get(jobId);
      if (bid && bid >= posted) ttfb.push(Math.round((bid - posted) / 60_000));
    }

    // Time-to-claim (minutes) for jobs that got claimed
    const ttc: number[] = [];
    for (const [jobId, posted] of postedAt) {
      const claimed = claimedAt.get(jobId);
      if (claimed && claimed >= posted) ttc.push(Math.round((claimed - posted) / 60_000));
    }

    // Stage-to-stage conversion
    const conversions: { from: string; to: string; rate: number | null }[] = [];
    for (let i = 0; i < STAGES.length - 1; i++) {
      const from = counts[STAGES[i]];
      const to   = counts[STAGES[i + 1]];
      conversions.push({
        from: STAGES[i],
        to:   STAGES[i + 1],
        rate: from > 0 ? Math.round((to / from) * 100) : null,
      });
    }

    return NextResponse.json({
      success: true,
      days,
      totalEvents: snap.size,
      counts,
      conversions,
      northStar: {
        timeToFirstBidMinutes: {
          median: median(ttfb),
          p75: percentile(ttfb, 0.75),
          sampleSize: ttfb.length,
        },
        timeToClaimMinutes: {
          median: median(ttc),
          p75: percentile(ttc, 0.75),
          sampleSize: ttc.length,
        },
        jobsPostedWithNoBid: [...postedAt.keys()].filter((j) => !firstBidAt.has(j) && !claimedAt.has(j)).length,
      },
    });
  } catch (err: any) {
    console.error("Funnel error:", err);
    return NextResponse.json({ error: err?.message ?? "Funnel failed" }, { status: 500 });
  }
}
