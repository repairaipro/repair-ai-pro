import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const revalidate = 300; // cache feed for 5 minutes

/**
 * GET /api/public/work-feed
 *
 * Public feed of completed-job transformations — the content engine of the
 * "social network for work." Privacy-safe by construction: exposes ONLY
 * work photos, trade, city, contractor identity, and photo captions.
 * Never job descriptions, addresses, prices, or homeowner identity.
 */
export async function GET() {
  try {
    // Single-field orderBy avoids composite-index requirements; filter in memory
    const jobsSnap = await adminDb
      .collection("jobs")
      .orderBy("updatedAt", "desc")
      .limit(120)
      .get();

    const completed = jobsSnap.docs
      .filter((d) => ["completed", "confirmed", "verified"].includes(d.data().status))
      .slice(0, 30);

    const contractorCache = new Map<string, { name: string; photoUrl: string | null }>();

    const items = await Promise.all(
      completed.map(async (jobDoc) => {
        const job = jobDoc.data();

        // Prefer explicit completion photos; fall back to completed-stage work photos
        let photosSnap = await jobDoc.ref
          .collection("completionPhotos")
          .limit(2)
          .get();
        let photos = photosSnap.docs.map((p) => ({
          url: p.data().url as string,
          caption: (p.data().caption as string) || "",
        }));

        if (photos.length === 0) {
          photosSnap = await jobDoc.ref
            .collection("workPhotos")
            .where("stage", "==", "completed")
            .limit(2)
            .get();
          photos = photosSnap.docs.map((p) => ({
            url: p.data().url as string,
            caption: (p.data().caption as string) || "",
          }));
        }

        if (photos.length === 0) return null; // no photos, no post

        // Contractor identity (cached per response)
        let contractor = null;
        const cid = job.claimedBy as string | undefined;
        if (cid) {
          if (!contractorCache.has(cid)) {
            const cSnap = await adminDb.collection("contractors").doc(cid).get();
            contractorCache.set(cid, {
              name: cSnap.data()?.name ?? "Contractor",
              photoUrl: cSnap.data()?.photoUrl ?? null,
            });
          }
          contractor = { id: cid, ...contractorCache.get(cid)! };
        }

        // City only — and only when the homeowner didn't restrict location
        const privacyOk = (job.locationPrivacyMode ?? "full") !== "zip_only";
        const city = privacyOk
          ? (typeof job.location === "object" ? job.location?.city ?? null : null)
          : null;

        return {
          jobId: jobDoc.id,
          trade: job.aiDetectedTrade ?? job.trade ?? "General",
          city,
          photos,
          contractor,
          completedAt: job.completedAt?.toDate?.()?.toISOString()
            ?? job.updatedAt?.toDate?.()?.toISOString()
            ?? null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      items: items.filter(Boolean),
    });
  } catch (err) {
    console.error("Work feed error:", err);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}
