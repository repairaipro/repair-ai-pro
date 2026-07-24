import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

type JobLocation = {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
};

/** Firestore rejects undefined values — strip them */
function compact<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const user = { uid: decoded.uid };

    const { location } = (await req.json()) as { location: JobLocation };
    const jobId = params.jobId;

    if (!location || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: "Invalid location data" },
        { status: 400 }
      );
    }

    const jobRef = adminDb.collection("jobs").doc(jobId);

    // Verify user is the claiming contractor
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists || jobSnap.data()!.claimedBy !== user.uid) {
      return NextResponse.json(
        { error: "Not authorized to update this job's location" },
        { status: 403 }
      );
    }

    // Update the job with latest contractor location
    await jobRef.update({
      contractorLocation: compact({
        lat: location.lat,
        lng: location.lng,
        timestamp: location.timestamp,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
      }),
      lastLocationUpdate: FieldValue.serverTimestamp(),
    });

    // Store in location history subcollection for trip tracking
    await jobRef.collection("locationHistory").add(
      compact({
        contractorId: user.uid,
        lat: location.lat,
        lng: location.lng,
        timestamp: location.timestamp,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update location" },
      { status: 500 }
    );
  }
}
