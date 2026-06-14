import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { notifyPostCommented } from "@/lib/notif";

/**
 * Comments — the depth of the social layer.
 *
 * GET  /api/posts/[postId]/comments  → public list (newest first), author merged
 * POST /api/posts/[postId]/comments  → auth required, creates comment + bumps count
 */

export async function GET(
  req: Request,
  { params }: { params: { postId: string } }
) {
  const rl = rateLimit(req, "comments-list", 60);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const snap = await adminDb
      .collection("posts").doc(params.postId)
      .collection("comments")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    // Merge author identity (cached)
    const cache = new Map<string, { name: string; photoUrl: string | null; isContractor: boolean }>();
    const comments = await Promise.all(
      snap.docs.map(async (d) => {
        const c = d.data();
        const aid = c.authorId as string;
        if (!cache.has(aid)) {
          // Prefer contractor profile, fall back to user doc
          const [cSnap, uSnap] = await Promise.all([
            adminDb.collection("contractors").doc(aid).get(),
            adminDb.collection("users").doc(aid).get(),
          ]);
          cache.set(aid, {
            name: cSnap.data()?.name ?? uSnap.data()?.displayName ?? uSnap.data()?.name ?? "User",
            photoUrl: cSnap.data()?.photoUrl ?? uSnap.data()?.photoURL ?? null,
            isContractor: cSnap.exists,
          });
        }
        return {
          id: d.id,
          text: c.text,
          createdAt: c.createdAt?.toDate?.()?.toISOString() ?? null,
          author: { id: aid, ...cache.get(aid)! },
        };
      })
    );

    return NextResponse.json({ success: true, comments });
  } catch (err) {
    console.error("List comments error:", err);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
  const rl = rateLimit(req, "comments-create", 20);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json();
    const text = String(body.text ?? "").trim().slice(0, 600);
    if (!text) return NextResponse.json({ error: "Comment can't be empty" }, { status: 400 });

    const postRef = adminDb.collection("posts").doc(params.postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const commentRef = postRef.collection("comments").doc();
    await commentRef.set({
      authorId: uid,
      text,
      createdAt: FieldValue.serverTimestamp(),
    });
    await postRef.update({ commentCount: FieldValue.increment(1) });

    // Notify the post owner (not on self-comment)
    const ownerId = postSnap.data()?.contractorId as string | undefined;
    if (ownerId && ownerId !== uid) {
      const name = (decoded.name as string) || decoded.email?.split("@")[0] || "Someone";
      notifyPostCommented(ownerId, name, uid, params.postId, text.slice(0, 80));
    }

    return NextResponse.json({ success: true, commentId: commentRef.id });
  } catch (err) {
    console.error("Create comment error:", err);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
