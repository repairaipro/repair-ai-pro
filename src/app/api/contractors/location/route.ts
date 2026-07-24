import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  validateLocation,
  getUpdateInterval,
  hasArrived,
  LocationUpdate,
  type LocationAccuracy,
} from "@/lib/locationService";

/**
 * POST /api/contractors/location
 *
 * Contractor sends their location update
 * - Validates location (outlier detection)
 * - Stores in Firestore for real-time homeowner sync
 * - Auto-deletes after 60 minutes
 * - Auto-marks arrival when contractor reaches destination
 *
 * Request body:
 * {
 *   "latitude": 37.7749,
 *   "longitude": -122.4194,
 *   "accuracy": 10,                    // meters (from device)
 *   "source": "gps",                   // "gps" | "wifi" | "cellular"
 *   "jobId": "job123",                 // current job
 *   "batteryLevel": 85,                // optional
 *   "speed": 25                        // optional, m/s
 * }
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Firebase token
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const {
      latitude,
      longitude,
      accuracy,
      source,
      jobId,
      batteryLevel = 100,
      speed = 0,
    } = body;

    // Validate input
    if (!latitude || !longitude || !accuracy || !source || !jobId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = adminDb;
    const jobRef = db.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();

    if (!jobSnap.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobSnap.data() as any;

    // Verify contractor owns this job
    if (job.claimedBy !== uid) {
      return NextResponse.json({ error: "Not your job" }, { status: 403 });
    }

    // Job must be active (accepted or in_progress)
    if (!["accepted", "in_progress"].includes(job.status)) {
      return NextResponse.json(
        { error: "Job not active" },
        { status: 400 }
      );
    }

    // Get last known location
    const lastLocSnap = await jobRef.collection("liveLocation").orderBy("timestamp", "desc").limit(1).get();
    const lastLocation = lastLocSnap.empty
      ? null
      : (lastLocSnap.docs[0].data() as any);

    // Validate location (catch GPS glitches)
    const newLocationUpdate: LocationUpdate = {
      latitude,
      longitude,
      accuracy,
      source,
      timestamp: Date.now(),
      speed,
    };

    const validated = validateLocation(newLocationUpdate, lastLocation);

    if (!validated.isValid) {
      // Location is an outlier, reject it but don't error
      console.log(`Location update rejected for job ${jobId}: ${validated.reason}`);
      return NextResponse.json(
        {
          accepted: false,
          reason: validated.reason,
        },
        { status: 400 }
      );
    }

    // Store validated location
    const locationDocRef = jobRef.collection("liveLocation").doc();
    await locationDocRef.set({
      latitude: validated.latitude,
      longitude: validated.longitude,
      accuracy: validated.accuracy,
      source: validated.source,
      distanceFromLast: validated.distanceFromLast,
      batteryLevel,
      speed,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(validated.timestamp),
    });

    // Set auto-delete (60 minutes from now)
    await locationDocRef.update({
      deleteAt: FieldValue.serverTimestamp(), // Firestore trigger will delete
      ttl: Math.floor(Date.now() / 1000) + 3600, // 60 minutes
    });

    // Check if contractor has arrived at destination
    const destination = job.location;
    if (destination?.latitude && destination?.longitude) {
      const arrived = hasArrived(
        validated.latitude,
        validated.longitude,
        destination.latitude,
        destination.longitude,
        0.2 // ~300 feet geofence
      );

      if (arrived && job.status === "accepted") {
        // Auto-mark as in_progress
        await jobRef.update({
          status: "in_progress",
          startedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Notify homeowner: contractor arrived
        const homeownerId = job.userId;
        if (homeownerId) {
          const contractorSnap = await db.collection("contractors").doc(uid).get();
          const contractor = contractorSnap.data() as any;
          const contractorName = contractor?.name || "Your contractor";

          // Create notification
          await db
            .collection("notifications")
            .doc(homeownerId)
            .collection("items")
            .add({
              type: "contractor_arrived",
              title: "Contractor arrived",
              body: `${contractorName} has arrived at your location.`,
              jobId,
              href: `/chat/${jobId}`,
              read: false,
              createdAt: FieldValue.serverTimestamp(),
            });

          console.log(`✅ Contractor ${uid} arrived at job ${jobId}`);
        }
      }
    }

    // Respond with update interval for client optimization
    const updateInterval = getUpdateInterval({
      jobState: job.status === "accepted" ? "heading" : "on_site",
      batteryLevel,
      signalStrength: accuracy < 20 ? "strong" : accuracy < 50 ? "medium" : "weak",
      locationAccuracy: validated.accuracy,
    });

    return NextResponse.json({
      accepted: true,
      nextUpdateIntervalMs: updateInterval,
      arrived: hasArrived(
        validated.latitude,
        validated.longitude,
        destination?.latitude || 0,
        destination?.longitude || 0
      ),
    });
  } catch (error: any) {
    console.error("Location update error:", error.message);
    return NextResponse.json({ error: "Failed to process location" }, { status: 500 });
  }
}

/**
 * GET /api/contractors/location
 * Get contractor's live location (for testing/debugging)
 */
export async function GET(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Get contractor's recent locations
    const locations = await adminDb
      .collectionGroup("liveLocation")
      .where("contractorId", "==", uid)
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    return NextResponse.json({
      recentLocations: locations.docs.map((doc) => doc.data()),
    });
  } catch (error: any) {
    console.error("Error fetching location:", error.message);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}
