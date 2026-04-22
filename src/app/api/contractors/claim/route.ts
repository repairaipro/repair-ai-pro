import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuthToken } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Claim an existing contractor listing.
 * The caller's UID takes ownership; the old profile's stats + reviews
 * are merged into the caller's document, and the old document is
 * marked as claimed so it won't appear in searches.
 */
export async function POST(req: Request) {
  const decoded = await verifyAuthToken(req).catch(() => null);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetUid } = await req.json();
  if (!targetUid) {
    return NextResponse.json({ error: "Missing targetUid" }, { status: 400 });
  }

  const callerUid = decoded.uid;

  if (callerUid === targetUid) {
    return NextResponse.json({ error: "Cannot claim your own profile" }, { status: 400 });
  }

  const targetRef = adminDb.collection("contractors").doc(targetUid);
  const callerRef = adminDb.collection("contractors").doc(callerUid);

  const [targetSnap, callerSnap] = await Promise.all([targetRef.get(), callerRef.get()]);

  if (!targetSnap.exists) {
    return NextResponse.json({ error: "Target contractor not found" }, { status: 404 });
  }

  const target = targetSnap.data()!;

  // Don't allow claiming an already-claimed profile
  if (target.claimedByUid) {
    return NextResponse.json(
      { error: "This listing has already been claimed by another account." },
      { status: 409 }
    );
  }

  const caller = callerSnap.exists ? callerSnap.data()! : {};

  await adminDb.runTransaction(async (tx) => {
    // Merge stats: keep the higher / sum them
    const mergedData = {
      // Identity fields come from caller (authenticated) profile
      uid:               callerUid,
      name:              caller.name              || target.name              || "",
      email:             caller.email             || target.email             || "",
      phone:             caller.phone             || target.phone             || "",
      trade:             caller.trade             || target.trade             || "",
      trades:            [...new Set([...(caller.trades ?? []), ...(target.trades ?? [])])],
      city:              caller.city              || target.city              || "",
      zipCode:           caller.zipCode           || target.zipCode           || "",
      serviceRadiusMiles:caller.serviceRadiusMiles ?? target.serviceRadiusMiles ?? 25,
      bio:               caller.bio               || target.bio               || "",
      photoUrl:          caller.photoUrl          || target.photoUrl          || "",
      hourly:            caller.hourly            ?? target.hourly            ?? null,
      experience:        caller.experience        ?? target.experience        ?? null,
      availability:      caller.availability      || target.availability      || "available",
      googlePlaceId:     caller.googlePlaceId     || target.googlePlaceId     || null,

      // Stats: sum the job counts, keep higher rating
      rating:                 Math.max(caller.rating ?? 0, target.rating ?? 0),
      reviewCount:            (caller.reviewCount ?? 0)            + (target.reviewCount ?? 0),
      jobsCompleted:          (caller.jobsCompleted ?? 0)          + (target.jobsCompleted ?? 0),
      jobsAccepted:           (caller.jobsAccepted ?? 0)           + (target.jobsAccepted ?? 0),
      invitationAcceptCount:  (caller.invitationAcceptCount ?? 0)  + (target.invitationAcceptCount ?? 0),
      invitationDeclineCount: (caller.invitationDeclineCount ?? 0) + (target.invitationDeclineCount ?? 0),

      // Merge metadata
      claimedFromUid: targetUid,
      updatedAt:      FieldValue.serverTimestamp(),
      lastActiveAt:   FieldValue.serverTimestamp(),
    };

    // Write merged data to caller's document
    tx.set(callerRef, mergedData, { merge: true });

    // Mark old document as claimed so it won't show in searches
    tx.update(targetRef, {
      claimedByUid: callerUid,
      claimedAt:    FieldValue.serverTimestamp(),
    });
  });

  return NextResponse.json({ success: true, message: "Business successfully claimed and merged." });
}
