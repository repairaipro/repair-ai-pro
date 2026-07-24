import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/**
 * GET /api/posts/[postId] — single post (public).
 * Optional auth → likedByMe. Used by the /work/[postId] permalink page.
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const snap = await adminDb.collection("posts").doc(params.postId).get();
    if (!snap.exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const p = snap.data()!;

    // Optional viewer → likedByMe
    let likedByMe = false;
    const header = req.headers.get("authorization") ?? "";
    if (header.startsWith("Bearer ")) {
      try {
        const uid = (await adminAuth.verifyIdToken(header.slice(7))).uid;
        const likeSnap = await snap.ref.collection("likes").doc(uid).get();
        likedByMe = likeSnap.exists;
      } catch { /* anonymous */ }
    }

    const cSnap = await adminDb.collection("contractors").doc(p.contractorId).get();

    return NextResponse.json({
      success: true,
      post: {
        id: snap.id,
        caption: p.caption ?? "",
        trade: p.trade ?? "General",
        photos: p.photos ?? [],
        video: p.video ?? null,
        poster: p.poster ?? null,
        hasVideo: !!p.video,
        beforeAfter: p.beforeAfter ?? false,
        likeCount: p.likeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        likedByMe,
        createdAt: p.createdAt?.toDate?.()?.toISOString() ?? null,
        contractor: {
          id: p.contractorId,
          name: cSnap.data()?.name ?? "Contractor",
          photoUrl: cSnap.data()?.photoUrl ?? null,
          city: cSnap.data()?.city ?? null,
          trade: cSnap.data()?.trade ?? null,
        },
      },
    });
  } catch (err) {
    console.error("Get post error:", err);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}
