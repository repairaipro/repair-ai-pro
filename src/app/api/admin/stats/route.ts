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

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [jobsSnap, contractorsSnap, usersSnap, disputesSnap] = await Promise.all([
      adminDb.collection("jobs").get(),
      adminDb.collection("contractors").get(),
      adminAuth.listUsers(1000),
      adminDb.collectionGroup("disputes").get(),
    ]);

    const jobs = jobsSnap.docs.map((d) => d.data());

    const statusCounts: Record<string, number> = {};
    let totalRevenue = 0;

    for (const job of jobs) {
      const s = job.status ?? "unknown";
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
      if (job.paymentStatus === "released") {
        totalRevenue += job.paymentAmountUsd ?? 0;
      }
    }

    const openDisputes = disputesSnap.docs.filter((d) => d.data().status === "open").length;

    return NextResponse.json({
      totalJobs:        jobs.length,
      totalContractors: contractorsSnap.size,
      totalUsers:       usersSnap.users.length,
      openDisputes,
      totalRevenue,
      statusCounts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
