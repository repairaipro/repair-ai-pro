import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

/** Normalize a name for fuzzy comparison: lowercase, strip punctuation/spaces */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Simple similarity: what % of the shorter string's chars are in the longer */
function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  let matches = 0;
  for (const ch of shorter) {
    if (longer.includes(ch)) matches++;
  }
  return matches / shorter.length;
}

export async function POST(req: Request) {
  const decoded = await verifyAuthToken(req).catch(() => null);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, phone, city, placeId } = await req.json();
  const callerUid = decoded.uid;

  const snap = await adminDb.collection("contractors").get();
  const duplicates: {
    uid: string;
    name: string;
    city: string;
    phone: string;
    trade: string;
    photoUrl: string;
    matchReason: "phone" | "name" | "placeId";
  }[] = [];

  for (const doc of snap.docs) {
    if (doc.id === callerUid) continue; // skip self

    const d = doc.data();

    // Exact phone match
    if (phone && d.phone && phone.replace(/\D/g, "") === d.phone.replace(/\D/g, "")) {
      duplicates.push({
        uid: doc.id,
        name: d.name ?? "",
        city: d.city ?? "",
        phone: d.phone ?? "",
        trade: d.trade ?? "",
        photoUrl: d.photoUrl ?? "",
        matchReason: "phone",
      });
      continue;
    }

    // Google Place ID match
    if (placeId && d.googlePlaceId && placeId === d.googlePlaceId) {
      duplicates.push({
        uid: doc.id,
        name: d.name ?? "",
        city: d.city ?? "",
        phone: d.phone ?? "",
        trade: d.trade ?? "",
        photoUrl: d.photoUrl ?? "",
        matchReason: "placeId",
      });
      continue;
    }

    // Fuzzy name + same city
    if (
      name && d.name && city && d.city &&
      city.toLowerCase() === (d.city ?? "").toLowerCase() &&
      similarity(name, d.name) >= 0.82
    ) {
      duplicates.push({
        uid: doc.id,
        name: d.name ?? "",
        city: d.city ?? "",
        phone: d.phone ?? "",
        trade: d.trade ?? "",
        photoUrl: d.photoUrl ?? "",
        matchReason: "name",
      });
    }
  }

  return NextResponse.json({ duplicates: duplicates.slice(0, 3) });
}
