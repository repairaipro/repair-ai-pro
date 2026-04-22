import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/push/subscribe  { token: string }
 *   → adds FCM token to users/{uid}.fcmTokens (deduped, max 10 devices)
 *
 * DELETE /api/push/subscribe  { token: string }
 *   → removes FCM token (e.g. on sign-out)
 */

async function getUid(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!idToken) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(uid);

  // arrayUnion dedupes automatically
  await userRef.update({
    fcmTokens: FieldValue.arrayUnion(token),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Keep at most 10 tokens (prune oldest if over)
  const snap = await userRef.get();
  const tokens: string[] = snap.data()?.fcmTokens ?? [];
  if (tokens.length > 10) {
    await userRef.update({
      fcmTokens: tokens.slice(tokens.length - 10),
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await adminDb.collection("users").doc(uid).update({
    fcmTokens: FieldValue.arrayRemove(token),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
