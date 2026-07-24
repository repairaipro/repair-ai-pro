import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Admin-only: this endpoint makes paid Google Places calls + mass Firestore writes
    const header = req.headers.get("authorization") ?? "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const adminUids = (process.env.ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!adminUids.includes(decoded.uid)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const trade = searchParams.get("trade") || "plumbing";
    const city = searchParams.get("city") || "houston";

    if (!GOOGLE_API_KEY) {
      return NextResponse.json({
        error: "Missing GOOGLE_PLACES_API_KEY",
      });
    }

    const query = `${trade} in ${city}`;

    let allResults: any[] = [];
    let nextPageToken: string | null = null;

    // 🔥 Pull multiple pages (up to ~60 results)
    for (let i = 0; i < 5; i++) {
      let url = "";

      if (i === 0) {
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          query
        )}&key=${GOOGLE_API_KEY}`;
      } else if (nextPageToken) {
        // IMPORTANT: delay required for next_page_token
        await new Promise((r) => setTimeout(r, 2000));

        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${GOOGLE_API_KEY}`;
      } else {
        break;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!data.results || data.results.length === 0) break;

      allResults = [...allResults, ...data.results];

      nextPageToken = data.next_page_token || null;

      if (!nextPageToken) break;
    }

    if (allResults.length === 0) {
      return NextResponse.json({
        imported: 0,
        businesses: [],
        message: "No businesses found",
      });
    }

    let createdCount = 0;
    let skippedCount = 0;

    const businesses: any[] = [];

    for (const place of allResults) {
      const googlePlaceId = place.place_id;

      // 🔥 Prevent duplicates
      const existing = await adminDb
        .collection("businesses")
        .where("googlePlaceId", "==", googlePlaceId)
        .limit(1)
        .get();

      if (!existing.empty) {
        skippedCount++;
        continue;
      }

      const docRef = await adminDb.collection("businesses").add({
        name: place.name,
        address: place.formatted_address,
        rating: place.rating || null,
        googlePlaceId,
        trade,
        city,
        location: place.geometry?.location || null,
        source: "google_places",
        claimed: false,
        createdAt: new Date(),
      });

      businesses.push({
        id: docRef.id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        googlePlaceId,
        status: "created",
      });

      createdCount++;
    }

    return NextResponse.json({
      imported: createdCount,
      skipped: skippedCount,
      totalPulled: allResults.length,
      businesses,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Import failed" },
      { status: 500 }
    );
  }
}
