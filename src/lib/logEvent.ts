import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/db";

export type JobEventType =
  | "job_created"
  | "job_accepted"
  | "job_started"
  | "job_completed"
  | "job_completed_pending"
  | "job_completed_confirmed"
  | "appointment_proposed"
  | "appointment_accepted"
  | "appointment_declined"
  | "appointment_cancelled"
  | "contact_revealed"
  | "review_left"
  | "dispute_opened"
  | "dispute_resolved"
  | "message_sent"
  | "attachment_added"
  | "ai_analysis_generated"
  | "ai_diagnosis"
  | "job_broadcasted"
  | "providers_invited"
  | "invitation_accepted"
  | "invitation_declined";

export async function logJobEvent(
  jobId: string,
  actorId: string,
  type: JobEventType,
  meta: Record<string, unknown> = {}
) {
  return addDoc(collection(db, "jobs", jobId, "events"), {
    type,
    actorId,
    meta,
    createdAt: serverTimestamp(),
  });
}
