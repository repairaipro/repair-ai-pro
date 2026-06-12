import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sanitizeContractor } from "@/lib/publicContractor";

export const revalidate = 300; // cache list for 5 minutes

/**
 * GET /api/public/contractors
 *
 * Public, sanitized contractor directory. Firestore rules require sign-in to
 * read the contractors collection (it holds emails/phones), so anonymous
 * visitors — including search engines — go through this endpoint, which
 * strips private fields server-side.
 */
export async function GET() {
  try {
    const snap = await adminDb.collection("contractors").limit(200).get();

    const contractors = snap.docs
      .filter((d) => !d.data().claimedByUid) // hide merged/claimed duplicates
      .map((d) => sanitizeContractor(d.id, d.data()));

    return NextResponse.json({ success: true, contractors });
  } catch (err) {
    console.error("Public contractors list error:", err);
    return NextResponse.json({ error: "Failed to load contractors" }, { status: 500 });
  }
}
