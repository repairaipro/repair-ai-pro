import { adminDb } from "@/lib/firebaseAdmin";

/**
 * Enforces proof-of-work before job progress is allowed
 */
export async function checkProofOfWork(jobId: string) {
  const eventsSnap = await adminDb
    .collection("jobs")
    .doc(jobId)
    .collection("events")
    .limit(1)
    .get();

  if (eventsSnap.empty) {
    throw new Error("Proof of work required before progress update");
  }
}
