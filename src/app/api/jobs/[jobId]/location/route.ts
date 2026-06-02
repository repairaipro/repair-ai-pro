import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { verifyAuth } from "@/lib/auth";

type JobLocation = {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
};

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { location } = (await req.json()) as { location: JobLocation };
    const jobId = params.jobId;

    if (!location || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: "Invalid location data" },
        { status: 400 }
      );
    }

    const jobRef = doc(db, "jobs", jobId);

    // Update the job with latest contractor location
    // Store in a subcollection for history, latest in main doc
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update location" },
      { status: 500 }
    );
  }
}
