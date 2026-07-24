import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

async function getUid(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) throw new Error("No token");

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const uid = await getUid(req);
    const { active, level } = await req.json();

    await adminDb.collection("contractors").doc(uid).set(
      {
        boostActive: !!active,
        boostLevel: level || 1,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 }
    );
  }
}