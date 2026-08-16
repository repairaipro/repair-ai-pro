import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

/**
 * GET /api/contractors/[id]
 *
 * Full (non-sanitized) contractor document for authenticated in-app reads —
 * scheduling widgets (CalendarConnect, WorkingHoursSettings) and the
 * schedule page need fields like icalFeedUrl/workingHours/bufferMinutes
 * that the public, sanitized /api/public/contractors/[id] endpoint
 * deliberately omits.
 *
 * This route didn't exist at all before — only nested subpaths under
 * [id]/ (availability, working-hours, ical-connect, etc.) did — so every
 * caller of the bare `GET /api/contractors/${uid}` 404'd. That broke
 * /contractor/schedule's own "is this a contractor" gate entirely (fixed
 * separately by switching that check to useIsContractor()) and left
 * CalendarConnect/WorkingHoursSettings unable to hydrate a contractor's
 * already-saved settings, silently showing defaults every visit.
 *
 * Requires sign-in only (not ownership) — matches firestore.rules'
 * `contractors/{id}` read rule (`allow read: if signedIn()`), so this adds
 * no exposure beyond what a client could already read directly today.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await adminAuth.verifyIdToken(token);

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const snap = await adminDb.collection("contractors").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    return NextResponse.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error("GET /api/contractors/[id] error:", err);
    return NextResponse.json({ error: "Failed to load contractor" }, { status: 500 });
  }
}
