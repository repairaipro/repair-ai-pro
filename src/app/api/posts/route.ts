import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

/**
 * Work showcase posts — the creation verb of the social layer.
 *
 * Contractors post photos of their work (on- or off-platform), captioned.
 * Platform-completed jobs still flow into the feed automatically as
 * "verified" items; posts let supply seed the feed before marketplace
 * volume exists, and give contractors a reason to share their profile.
 */

/**
 * POST /api/posts
 * Body: { caption, trade, photos: string[] (1-4 urls), beforeAfter?: boolean }
 * Auth: contractor (must have a contractor profile)
 */
export async function POST(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Must be a contractor
    const contractorSnap = await adminDb.collection("contractors").doc(uid).get();
    if (!contractorSnap.exists) {
      return NextResponse.json(
        { error: "Set up your contractor profile before posting work" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const caption = String(body.caption ?? "").trim().slice(0, 500);
    const trade   = String(body.trade ?? contractorSnap.data()?.trade ?? "General").slice(0, 50);
    const photos  = (Array.isArray(body.photos) ? body.photos : [])
      .filter((u: unknown) => typeof u === "string" && /^https?:\/\//.test(u))
      .slice(0, 4);
    const beforeAfter = body.beforeAfter === true && photos.length >= 2;

    if (photos.length === 0) {
      return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
    }

    const post = {
      contractorId: uid,
      caption,
      trade,
      photos,
      beforeAfter,
      likeCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection("posts").add(post);

    // Denormalize post count for profile display
    await adminDb.collection("contractors").doc(uid).set(
      { postCount: FieldValue.increment(1) },
      { merge: true }
    );

    return NextResponse.json({ success: true, postId: ref.id });
  } catch (err: any) {
    console.error("Create post error:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

/**
 * GET /api/posts?contractorId=&limit=
 * Public. Optional Authorization header → response includes likedByMe.
 */
export async function GET(req: Request) {
  const rl = rateLimit(req, "posts-list", 60);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const url = new URL(req.url);
    const contractorId = url.searchParams.get("contractorId");
    const followingOnly = url.searchParams.get("following") === "true";
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 30)));

    // Who's asking? (optional — enables likedByMe and the following feed)
    let viewerUid: string | null = null;
    const header = req.headers.get("authorization") ?? "";
    if (header.startsWith("Bearer ")) {
      try {
        viewerUid = (await adminAuth.verifyIdToken(header.slice(7))).uid;
      } catch { /* anonymous is fine */ }
    }

    // Following feed: posts only from contractors the viewer follows
    if (followingOnly) {
      if (!viewerUid) {
        return NextResponse.json({ error: "Sign in to see your following feed" }, { status: 401 });
      }
      const followingSnap = await adminDb
        .collection("users").doc(viewerUid)
        .collection("following")
        .limit(30) // Firestore `in` cap
        .get();
      const followedIds = followingSnap.docs.map((d) => d.id);
      if (followedIds.length === 0) {
        return NextResponse.json({ success: true, posts: [], following: true, emptyReason: "not_following_anyone" });
      }
      const snap = await adminDb
        .collection("posts")
        .where("contractorId", "in", followedIds)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      const posts = await hydratePosts(snap, viewerUid);
      return NextResponse.json({ success: true, posts, following: true });
    }

    let q: FirebaseFirestore.Query = adminDb.collection("posts");
    if (contractorId) q = q.where("contractorId", "==", contractorId);
    // Single orderBy after equality filter — auto-indexed
    const snap = await q.orderBy("createdAt", "desc").limit(limit).get();

    const posts = await hydratePosts(snap, viewerUid);
    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    console.error("List posts error:", err);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

/** Add likedByMe (for signed-in viewer) + merge contractor identity */
async function hydratePosts(
  snap: FirebaseFirestore.QuerySnapshot,
  viewerUid: string | null
) {
  // likedByMe in one batched read
  const likedSet = new Set<string>();
  if (viewerUid && snap.size > 0) {
    const likeRefs = snap.docs.map((d) =>
      adminDb.collection("posts").doc(d.id).collection("likes").doc(viewerUid)
    );
    const likeSnaps = await adminDb.getAll(...likeRefs);
    likeSnaps.forEach((s, i) => { if (s.exists) likedSet.add(snap.docs[i].id); });
  }

  // Merge contractor identity (cached per response)
  const cCache = new Map<string, { name: string; photoUrl: string | null; city: string | null }>();
  return Promise.all(
    snap.docs.map(async (d) => {
      const p = d.data();
      const cid = p.contractorId as string;
      if (!cCache.has(cid)) {
        const cSnap = await adminDb.collection("contractors").doc(cid).get();
        cCache.set(cid, {
          name: cSnap.data()?.name ?? "Contractor",
          photoUrl: cSnap.data()?.photoUrl ?? null,
          city: cSnap.data()?.city ?? null,
        });
      }
      return {
        id: d.id,
        caption: p.caption,
        trade: p.trade,
        photos: p.photos,
        beforeAfter: p.beforeAfter ?? false,
        likeCount: p.likeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        likedByMe: likedSet.has(d.id),
        createdAt: p.createdAt?.toDate?.()?.toISOString() ?? null,
        contractor: { id: cid, ...cCache.get(cid)! },
      };
    })
  );
}
