/**
 * Cloud Function: Job Arrival/Departure Notifications
 *
 * Deploy this to Firebase Cloud Functions to send push notifications
 * when contractors arrive at or depart from job locations.
 *
 * Setup:
 * 1. Initialize Firebase Functions: `firebase init functions` (in repo root)
 * 2. Copy this file to functions/src/notifyJobArrival.ts
 * 3. Deploy: `firebase deploy --only functions`
 *
 * Triggers on writes to jobs/{jobId}/locationHistory
 * Sends FCM push notification to homeowner when contractor arrives/departs
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const messaging = admin.messaging();

const GEOFENCE_RADIUS_MILES = 0.5;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const onLocationUpdate = functions.firestore
  .document("jobs/{jobId}/locationHistory/{historyId}")
  .onCreate(async (snap, context) => {
    try {
      const { jobId } = context.params;
      const location = snap.data();

      // Get job details
      const jobDoc = await db.collection("jobs").doc(jobId).get();
      if (!jobDoc.exists) return;

      const job = jobDoc.data();
      const homeownerId = job?.userId;
      const contractorId = job?.claimedBy;

      if (!homeownerId || !contractorId) return;

      // Get customer location
      const customerLocation = job?.location?.coordinates;
      if (!customerLocation) return;

      // Check if contractor is within geofence
      const distance = haversineDistance(
        location.lat,
        location.lng,
        customerLocation.lat,
        customerLocation.lng
      );

      const withinGeofence = distance <= GEOFENCE_RADIUS_MILES;

      // Get homeowner's FCM tokens
      const userDoc = await db.collection("users").doc(homeownerId).get();
      const tokens = userDoc.data()?.fcmTokens || [];

      if (tokens.length === 0) return;

      // Determine notification type
      let title = "";
      let body = "";

      // Check previous location to determine arrival/departure
      const prevLocations = await db
        .collection("jobs")
        .doc(jobId)
        .collection("locationHistory")
        .orderBy("timestamp", "desc")
        .limit(2)
        .get();

      if (prevLocations.docs.length > 1) {
        const prevLocation = prevLocations.docs[1].data();
        const prevDistance = haversineDistance(
          prevLocation.lat,
          prevLocation.lng,
          customerLocation.lat,
          customerLocation.lng
        );
        const wasWithinGeofence = prevDistance <= GEOFENCE_RADIUS_MILES;

        // Arrival: was outside, now inside
        if (!wasWithinGeofence && withinGeofence) {
          title = "Contractor Arrived 📍";
          body = `${job.contractorName || "Contractor"} has arrived at your job location`;
        }
        // Departure: was inside, now outside
        else if (wasWithinGeofence && !withinGeofence) {
          title = "Contractor Departed 🚗";
          body = `${job.contractorName || "Contractor"} left your job location`;
        }
      }

      // Send push notification if we determined a type
      if (title && body) {
        const message: admin.messaging.MulticastMessage = {
          notification: {
            title,
            body,
          },
          data: {
            jobId,
            type: title.includes("Arrived") ? "arrival" : "departure",
            timestamp: location.timestamp.toString(),
          },
          tokens,
        };

        await messaging.sendMulticast(message);

        // Log notification to notificationHistory
        await db
          .collection("jobs")
          .doc(jobId)
          .collection("notificationHistory")
          .add({
            type: title.includes("Arrived") ? "arrival" : "departure",
            title,
            body,
            recipientId: homeownerId,
            senderId: contractorId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });
      }
    } catch (error) {
      console.error("Error in onLocationUpdate:", error);
    }
  });

/**
 * Alternative: Triggers on job status changes to send notifications
 * E.g., "Contractor marked job as complete"
 */
export const onJobStatusChange = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    try {
      const { jobId } = context.params;
      const before = change.before.data();
      const after = change.after.data();

      if (before.status === after.status) return;

      const homeownerId = after.userId;
      const contractorId = after.claimedBy;

      // Only notify homeowner on certain status changes
      const notifyOn = ["in_progress", "completed"];
      if (!notifyOn.includes(after.status)) return;

      const userDoc = await db.collection("users").doc(homeownerId).get();
      const tokens = userDoc.data()?.fcmTokens || [];

      if (tokens.length === 0) return;

      let title = "";
      let body = "";

      switch (after.status) {
        case "in_progress":
          title = "Work Started 🔨";
          body = `${after.contractorName || "Contractor"} has started work`;
          break;
        case "completed":
          title = "Work Complete ✓";
          body = `${after.contractorName || "Contractor"} marked the job complete`;
          break;
      }

      if (title && body) {
        const message: admin.messaging.MulticastMessage = {
          notification: { title, body },
          data: {
            jobId,
            type: "status_update",
          },
          tokens,
        };

        await messaging.sendMulticast(message);

        // Log to notificationHistory
        await db
          .collection("jobs")
          .doc(jobId)
          .collection("notificationHistory")
          .add({
            type: "status_update",
            title,
            body,
            status: after.status,
            recipientId: homeownerId,
            senderId: contractorId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });
      }
    } catch (error) {
      console.error("Error in onJobStatusChange:", error);
    }
  });
