import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { notifyPostCommented } from "@/lib/notif";

/**
 * Threaded comments — Instagram-style replies with @mentions.
 *
 * Data model:
 *   posts/{postId}/comments/{commentId}
 *     authorId, text, createdAt
 *     parentCommentId?: string   ← set for replies
 *     replyCount?:     number    ← denormalized on parent
 *     mentions?:       string[]  ← authorIds @mentioned
 *
 * GET  → top-level comments + up to 3 replies each (expandable via ?parentId=)
 * POST → creates comment or reply; notifies post owner + parent author
 */

type AuthorInfo = { name: string; photoUrl: string | null; isContractor: boolean };

async function resolveAuthor(uid: string, cache: Map<string, AuthorInfo>): Promise<AuthorInfo> {
  if (cache.has(uid)) return cache.get(uid)!;
  const [cSnap, uSnap] = await Promise.all([
    adminDb.collection("contractors").doc(uid).get(),
    adminDb.collection("users").doc(uid).get(),
  ]);
  const info: AuthorInfo = {
    name:         cSnap.data()?.name ?? uSnap.data()?.displayName ?? uSnap.data()?.name ?? "User",
    photoUrl:     cSnap.data()?.photoUrl ?? uSnap.data()?.photoURL ?? null,
    isContractor: cSnap.exists,
  };
  cache.set(uid, info);
  return info;
}

/** GET /api/posts/[postId]/comments
 * ?parentId=  → fetch replies for a specific comment (pagination)
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { postId: string } }
) {
  const rl = rateLimit(req, "comments-list", 60);
  if (!rl.ok) return rateLimitResponse(rl);

  const url = new URL(req.url);
  const parentId = url.searchParams.get("parentId"); // fetch replies for a parent

  try {
    const cache = new Map<string, AuthorInfo>();

    if (parentId) {
      // Return all replies for a specific comment
      const snap = await adminDb
        .collection("posts").doc(params.postId)
        .collection("comments")
        .where("parentCommentId", "==", parentId)
        .orderBy("createdAt", "asc")
        .limit(50)
        .get();

      const replies = await Promise.all(snap.docs.map(async (d) => {
        const c = d.data();
        const author = await resolveAuthor(c.authorId, cache);
        return {
          id: d.id,
          text: c.text,
          createdAt: c.createdAt?.toDate?.()?.toISOString() ?? null,
          parentCommentId: c.parentCommentId,
          mentions: c.mentions ?? [],
          author: { id: c.authorId, ...author },
        };
      }));

      return NextResponse.json({ success: true, replies });
    }

    // Top-level: fetch all, split by parentCommentId
    const snap = await adminDb
      .collection("posts").doc(params.postId)
      .collection("comments")
      .orderBy("createdAt", "desc")
      .limit(120)
      .get();

    const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // Separate top-level from replies
    const topLevel = allDocs.filter(c => !c.parentCommentId);
    const repliesMap = new Map<string, any[]>();
    allDocs
      .filter(c => c.parentCommentId)
      .forEach(r => {
        if (!repliesMap.has(r.parentCommentId)) repliesMap.set(r.parentCommentId, []);
        repliesMap.get(r.parentCommentId)!.push(r);
      });

    const comments = await Promise.all(
      topLevel.slice(0, 60).map(async (c) => {
        const author = await resolveAuthor(c.authorId, cache);
        const rawReplies = (repliesMap.get(c.id) ?? [])
          .sort((a: any, b: any) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));

        const replies = await Promise.all(
          rawReplies.slice(0, 3).map(async (r: any) => {
            const rAuthor = await resolveAuthor(r.authorId, cache);
            return {
              id: r.id,
              text: r.text,
              createdAt: r.createdAt?.toDate?.()?.toISOString() ?? null,
              mentions: r.mentions ?? [],
              author: { id: r.authorId, ...rAuthor },
            };
          })
        );

        return {
          id: c.id,
          text: c.text,
          createdAt: c.createdAt?.toDate?.()?.toISOString() ?? null,
          mentions: c.mentions ?? [],
          replyCount: c.replyCount ?? rawReplies.length,
          replies,
          author: { id: c.authorId, ...author },
        };
      })
    );

    return NextResponse.json({ success: true, comments });
  } catch (err) {
    console.error("List comments error:", err);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

/** POST /api/posts/[postId]/comments
 * Body: { text, parentCommentId?, mentionedUid? }
 */
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
    const text            = String(body.text ?? "").trim().slice(0, 600);
    const parentCommentId = body.parentCommentId ? String(body.parentCommentId) : null;
    const mentionedUid    = body.mentionedUid ? String(body.mentionedUid) : null;

    if (!text) return NextResponse.json({ error: "Comment can't be empty" }, { status: 400 });

    const postRef = adminDb.collection("posts").doc(params.postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const commentRef = postRef.collection("comments").doc();
    const commentData: Record<string, any> = {
      authorId:  uid,
      text,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (parentCommentId) commentData.parentCommentId = parentCommentId;
    if (mentionedUid)    commentData.mentions = [mentionedUid];

    const batch = adminDb.batch();
    batch.set(commentRef, commentData);

    if (parentCommentId) {
      // Increment replyCount on parent comment
      const parentRef = postRef.collection("comments").doc(parentCommentId);
      batch.update(parentRef, { replyCount: FieldValue.increment(1) });
    } else {
      // Only top-level comments bump the post's commentCount
      batch.update(postRef, { commentCount: FieldValue.increment(1) });
    }

    await batch.commit();

    // ── Notifications ────────────────────────────────────────────────────
    const authorName = (decoded.name as string) || decoded.email?.split("@")[0] || "Someone";
    const postOwnerId = postSnap.data()?.contractorId as string | undefined;
    const snippet = text.slice(0, 80);

    // Notify post owner (not self)
    if (postOwnerId && postOwnerId !== uid && !parentCommentId) {
      notifyPostCommented(postOwnerId, authorName, uid, params.postId, snippet);
    }

    // Notify parent comment author when someone replies (not self)
    if (parentCommentId) {
      const parentSnap = await postRef.collection("comments").doc(parentCommentId).get();
      const parentAuthorId = parentSnap.data()?.authorId as string | undefined;
      if (parentAuthorId && parentAuthorId !== uid) {
        notifyPostCommented(parentAuthorId, authorName, uid, params.postId, `replied: ${snippet}`);
      }
      // Also notify post owner of the reply (if different from parent author)
      if (postOwnerId && postOwnerId !== uid && postOwnerId !== parentAuthorId) {
        notifyPostCommented(postOwnerId, authorName, uid, params.postId, `replied: ${snippet}`);
      }
    }

    return NextResponse.json({ success: true, commentId: commentRef.id });
  } catch (err) {
    console.error("Create comment error:", err);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
