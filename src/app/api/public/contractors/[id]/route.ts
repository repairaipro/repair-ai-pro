import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sanitizeContractor } from "@/lib/publicContractor";

export const revalidate = 120; // cache profile for 2 minutes

/**
 * GET /api/public/contractors/[id]
 *
 * Public, sanitized single contractor profile + recent reviews.
 * Used by the public profile page so anonymous visitors (and crawlers
 * reading the LocalBusiness JSON-LD) get real data.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const snap = await adminDb.collection("contractors").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    const reviewsSnap = await adminDb
      .collection("contractors").doc(id)
      .collection("reviews")
      .orderBy("createdAt", "desc")
      .limit(25)
      .get();

    const reviews = reviewsSnap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        rating:    r.rating ?? 0,
        text:      r.text ?? "",
        createdAt: r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : null,
        // reviewer identity intentionally omitted on the public endpoint
      };
    });

    return NextResponse.json({
      success: true,
      contractor: sanitizeContractor(snap.id, snap.data()!),
      reviews,
    });
  } catch (err) {
    console.error("Public contractor profile error:", err);
    return NextResponse.json({ error: "Failed to load contractor" }, { status: 500 });
  }
}
