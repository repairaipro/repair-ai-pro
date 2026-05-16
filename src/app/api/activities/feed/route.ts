import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const filterType = url.searchParams.get("type"); // optional filter: referral_used, job_completed, review_submitted

    // Get user's activity feed
    // For now, activities are platform-wide (showing recent activity)
    // Later can be personalized based on user's network/trades
    let query = adminDb
      .collection("activities")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (filterType) {
      query = query.where("type", "==", filterType);
    }

    const snap = await query.get();

    const activities = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        // Sanitize sensitive data
        ...(data.type === 'referral_used' && {
          referralType: data.referralType,
          rewardAmount: data.rewardAmount,
        }),
        ...(data.type === 'job_completed' && {
          trade: data.trade,
          location: data.location,
        }),
        ...(data.type === 'review_submitted' && {
          rating: data.rating,
          trade: data.trade,
        }),
      };
    });

    // Enrich activities with user info (names, avatars - fetch async)
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        if (activity.type === 'referral_used') {
          try {
            // Optionally fetch referrer info
            return activity;
          } catch {
            return activity;
          }
        }
        return activity;
      })
    );

    return NextResponse.json({
      activities: enrichedActivities,
      count: enrichedActivities.length,
      hasMore: snap.docs.length === limit,
    });
  } catch (err: any) {
    console.error("activity feed error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
