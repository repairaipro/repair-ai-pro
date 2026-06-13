import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * The identity graph of the social layer.
 *
 * POST /api/contractors/[id]/follow — toggle follow (auth required)
 *   Returns { following, followerCount }
 * GET — current state for the signed-in viewer (or just the count anonymously)
 */

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Sign in to follow pros" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const contractorId = params.id;

    if (uid === contractorId) {
      return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });
    }

    const contractorRef = adminDb.collection("contractors").doc(contractorId);
    const followerRef   = contractorRef.collection("followers").doc(uid);
    const followingRef  = adminDb.collection("users").doc(uid).collection("following").doc(contractorId);

    const result = await adminDb.runTransaction(async (tx) => {
      const [cSnap, fSnap] = await Promise.all([tx.get(contractorRef), tx.get(followerRef)]);
      if (!cSnap.exists) throw new Error("Contractor not found");

      const current = cSnap.data()?.followerCount ?? 0;

      if (fSnap.exists) {
        tx.delete(followerRef);
        tx.delete(followingRef);
        tx.update(contractorRef, { followerCount: Math.max(0, current - 1) });
        return { following: false, followerCount: Math.max(0, current - 1) };
      }

      tx.set(followerRef, { uid, at: FieldValue.serverTimestamp() });
      tx.set(followingRef, { contractorId, at: FieldValue.serverTimestamp() });
      tx.update(contractorRef, { followerCount: current + 1 });
      return { following: true, followerCount: current + 1 };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    const notFound = err?.message === "Contractor not found";
    return NextResponse.json(
      { error: notFound ? "Contractor not found" : "Failed to toggle follow" },
      { status: notFound ? 404 : 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contractorRef = adminDb.collection("contractors").doc(params.id);
    const cSnap = await contractorRef.get();
    if (!cSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let following = false;
    const header = req.headers.get("authorization") ?? "";
    if (header.startsWith("Bearer ")) {
      try {
        const decoded = await adminAuth.verifyIdToken(header.slice(7));
        const fSnap = await contractorRef.collection("followers").doc(decoded.uid).get();
        following = fSnap.exists;
      } catch { /* anonymous */ }
    }

    return NextResponse.json({
      success: true,
      following,
      followerCount: cSnap.data()?.followerCount ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
