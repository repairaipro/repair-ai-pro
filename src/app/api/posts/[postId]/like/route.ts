import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyPostLiked } from "@/lib/notif";

/**
 * POST /api/posts/[postId]/like — toggle like (auth required)
 * Returns { liked, likeCount }
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Sign in to like posts" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const postRef = adminDb.collection("posts").doc(params.postId);
    const likeRef = postRef.collection("likes").doc(uid);

    const result = await adminDb.runTransaction(async (tx) => {
      const [postSnap, likeSnap] = await Promise.all([tx.get(postRef), tx.get(likeRef)]);
      if (!postSnap.exists) throw new Error("Post not found");

      const current = postSnap.data()?.likeCount ?? 0;
      const ownerId = postSnap.data()?.contractorId as string | undefined;

      if (likeSnap.exists) {
        tx.delete(likeRef);
        tx.update(postRef, { likeCount: Math.max(0, current - 1) });
        return { liked: false, likeCount: Math.max(0, current - 1), ownerId };
      }

      tx.set(likeRef, { uid, at: FieldValue.serverTimestamp() });
      tx.update(postRef, { likeCount: current + 1 });
      return { liked: true, likeCount: current + 1, ownerId };
    });

    // Notify post owner on a new like (not unlike, not self-like) — in-app only
    if (result.liked && result.ownerId && result.ownerId !== uid) {
      const likerName = (decoded.name as string) || decoded.email?.split("@")[0] || "Someone";
      notifyPostLiked(result.ownerId, likerName, uid, params.postId);
    }

    return NextResponse.json({ success: true, liked: result.liked, likeCount: result.likeCount });
  } catch (err: any) {
    const notFound = err?.message === "Post not found";
    return NextResponse.json(
      { error: notFound ? "Post not found" : "Failed to toggle like" },
      { status: notFound ? 404 : 500 }
    );
  }
}
