import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { adminAuth } from "@/lib/firebaseAdmin";

type JobLocation = {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
};

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

    const jobRef = doc(db, "jobs", jobId);

    // Verify user is the claiming contractor
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists() || jobSnap.data().claimedBy !== user.uid) {
      return NextResponse.json(
        { error: "Not authorized to update this job's location" },
        { status: 403 }
      );
    }

    // Update the job with latest contractor location
    await updateDoc(jobRef, {
      contractorLocation: {
        lat: location.lat,
        lng: location.lng,
        timestamp: location.timestamp,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
      },
      lastLocationUpdate: serverTimestamp(),
    });

    // Store in location history subcollection for trip tracking
    const historyRef = collection(db, "jobs", jobId, "locationHistory");
    await addDoc(historyRef, {
      contractorId: user.uid,
      lat: location.lat,
      lng: location.lng,
      timestamp: location.timestamp,
      accuracy: location.accuracy,
      speed: location.speed,
      heading: location.heading,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update location" },
      { status: 500 }
    );
  }
}
