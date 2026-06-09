/**
 * Server-side notification helper (uses adminDb — call from API routes only).
 *
 * Each helper fires two things in parallel:
 *   1. Firestore notification doc (shows in the in-app bell)
 *   2. Email via Resend (reaches the user even when the app is closed)
 *
 * Both are fire-and-forget — neither will throw to the caller.
 */

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail } from "@/lib/email";
import { sendPush } from "@/lib/fcm";
import { sendSMS } from "@/lib/sms";

export type NotifType =
  | "contractor_invited"
  | "job_accepted"
  | "job_started"
  | "job_completed"
  | "job_confirmed"
  | "new_message"
  | "review_received"
  | "payout_failed"
  | "video_consultation_requested"
  | "video_consultation_approved";

export type NotifPayload = {
  recipientId: string;
  type: NotifType;
  title: string;
  body: string;
  jobId?: string;
  href?: string;
  actorId?: string;
  actorName?: string;
};

export async function createNotification(payload: NotifPayload): Promise<void> {
  // Write to notifications/{uid}/items/{docId} so client-side listeners work
  await adminDb
    .collection("notifications")
    .doc(payload.recipientId)
    .collection("items")
    .add({
      type:      payload.type,
      title:     payload.title,
      body:      payload.body,
      jobId:     payload.jobId    ?? null,
      href:      payload.href     ?? null,
      actorId:   payload.actorId  ?? null,
      actorName: payload.actorName ?? null,
      read:      false,
      createdAt: FieldValue.serverTimestamp(),
    });
}

/* ── Typed convenience helpers ─────────────────────────────────────────── */

export function notifyContractorInvited(
  contractorId: string,
  jobId: string,
  trade: string,
  city: string
) {
  const title = "New job invitation";
  const body  = `${trade} job in ${city} — tap to view and accept`;
  const href  = `/contractor-inbox`;
  const smsTitle = "🔧 New job invitation";
  const smsBody = `${trade} in ${city}. Respond now at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://repair-ai-pro.vercel.app'}/contractor-inbox`;
  return Promise.all([
    createNotification({ recipientId: contractorId, type: "contractor_invited", title, body, jobId, href }),
    sendEmail(contractorId, { type: "contractor_invited", trade, city, jobId }),
    sendPush(contractorId, { title, body, href, jobId, type: "contractor_invited", requireInteraction: true }),
    sendSMS(contractorId, { title: smsTitle, body: smsBody, link: href }),
  ]).then(() => undefined);
}

export function notifyJobAccepted(
  homeownerId: string,
  jobId: string,
  contractorName: string
) {
  const title = "Contractor accepted your job!";
  const body  = `${contractorName} is on the way. Open the job chat to coordinate.`;
  const href  = `/chat/${jobId}`;
  const smsBody = `✅ ${contractorName} accepted! Chat: ${process.env.NEXT_PUBLIC_APP_URL || 'https://repair-ai-pro.vercel.app'}/chat/${jobId}`;
  return Promise.all([
    createNotification({ recipientId: homeownerId, type: "job_accepted", title, body, jobId, href }),
    sendEmail(homeownerId, { type: "job_accepted", contractorName, jobId }),
    sendPush(homeownerId, { title, body, href, jobId, type: "job_accepted" }),
    sendSMS(homeownerId, { title: "Contractor accepted!", body: smsBody, link: href }),
  ]).then(() => undefined);
}

export function notifyJobStarted(homeownerId: string, jobId: string, jobDescription = "") {
  const title = "Work has started";
  const body  = "Your contractor has begun work on your job.";
  const href  = `/chat/${jobId}`;
  const smsBody = `🚀 Work starting now. Open chat: ${process.env.NEXT_PUBLIC_APP_URL || 'https://repair-ai-pro.vercel.app'}/chat/${jobId}`;
  return Promise.all([
    createNotification({ recipientId: homeownerId, type: "job_started", title, body, jobId, href }),
    sendEmail(homeownerId, { type: "job_started", jobDescription, jobId }),
    sendPush(homeownerId, { title, body, href, jobId, type: "job_started" }),
    sendSMS(homeownerId, { title, body: smsBody, link: href }),
  ]).then(() => undefined);
}

export function notifyJobCompleted(homeownerId: string, jobId: string) {
  const title = "Work is done — please confirm";
  const body  = "Your contractor marked the job complete. Confirm to release payment and leave a review.";
  const href  = `/chat/${jobId}`;
  const smsBody = `✓ Work done! Confirm & release payment: ${process.env.NEXT_PUBLIC_APP_URL || 'https://repair-ai-pro.vercel.app'}/chat/${jobId}`;
  return Promise.all([
    createNotification({ recipientId: homeownerId, type: "job_completed", title, body, jobId, href }),
    sendEmail(homeownerId, { type: "job_completed", jobId }),
    sendPush(homeownerId, { title, body, href, jobId, type: "job_completed", requireInteraction: true }),
    sendSMS(homeownerId, { title, body: smsBody, link: href }),
  ]).then(() => undefined);
}

export function notifyJobConfirmed(contractorId: string, jobId: string) {
  const title = "Job confirmed!";
  const body  = "The homeowner confirmed your work. A review may follow — great job!";
  const href  = `/chat/${jobId}`;
  return Promise.all([
    createNotification({ recipientId: contractorId, type: "job_confirmed", title, body, jobId, href }),
    sendEmail(contractorId, { type: "job_confirmed", jobId }),
    sendPush(contractorId, { title, body, href, jobId, type: "job_confirmed" }),
  ]).then(() => undefined);
}

export function notifyNewMessage(
  recipientId: string,
  jobId: string,
  senderName: string
) {
  const title = `New message from ${senderName}`;
  const body  = "Tap to open the conversation.";
  const href  = `/chat/${jobId}`;
  const smsBody = `💬 ${senderName} sent a message: ${process.env.NEXT_PUBLIC_APP_URL || 'https://repair-ai-pro.vercel.app'}/chat/${jobId}`;
  return Promise.all([
    createNotification({ recipientId, type: "new_message", title, body, jobId, href }),
    sendEmail(recipientId, { type: "new_message", senderName, jobId }),
    sendPush(recipientId, { title, body, href, jobId, type: "new_message" }),
    sendSMS(recipientId, { title, body: smsBody, link: href }),
  ]).then(() => undefined);
}

export async function notifyDisputeOpened(
  homeownerId: string,
  contractorId: string | undefined,
  reporterId: string,
  jobId: string,
  category: string
) {
  const reporterRole = reporterId === homeownerId ? "homeowner" : "contractor";

  const recipients = [
    homeownerId,
    ...(contractorId && contractorId !== reporterId ? [contractorId] : []),
    ...(homeownerId !== reporterId ? [] : contractorId ? [] : []),
  ].filter(Boolean) as string[];

  // Notify everyone involved
  const disputeTitle = "A dispute has been opened";
  const disputeBody  = `Category: ${category}. Payment is frozen until resolved.`;
  const disputeHref  = `/chat/${jobId}`;
  const disputeSMS = `⚠️ Dispute filed. Payment frozen. Category: ${category}. ${process.env.NEXT_PUBLIC_APP_URL || 'https://repair-ai-pro.vercel.app'}/chat/${jobId}`;
  const tasks = recipients.map((recipientId) =>
    Promise.all([
      createNotification({
        recipientId,
        type:  "dispute_opened" as any,
        title: disputeTitle,
        body:  disputeBody,
        jobId,
        href:  disputeHref,
      }),
      sendEmail(recipientId, { type: "dispute_opened", category, reporterRole, jobId }),
      sendPush(recipientId, { title: disputeTitle, body: disputeBody, href: disputeHref, jobId, type: "dispute_opened", requireInteraction: true }),
      sendSMS(recipientId, { title: "Dispute opened", body: disputeSMS, link: disputeHref }),
    ])
  );

  await Promise.all(tasks).catch(console.error);
}

export function notifyJobCancelled(
  recipientId: string,
  jobId: string,
  cancelledByRole: string
) {
  const title = "Job was cancelled";
  const body  = `The ${cancelledByRole} cancelled this job. Any held payment will be refunded.`;
  const href  = `/chat/${jobId}`;
  const smsBody = `❌ Job cancelled by ${cancelledByRole}. Refund processing. ${process.env.NEXT_PUBLIC_APP_URL || 'https://repair-ai-pro.vercel.app'}/chat/${jobId}`;
  return Promise.all([
    createNotification({ recipientId, type: "job_cancelled" as any, title, body, jobId, href }),
    sendEmail(recipientId, { type: "job_cancelled", cancelledByRole, jobId }),
    sendPush(recipientId, { title, body, href, jobId, type: "job_cancelled" }),
    sendSMS(recipientId, { title, body: smsBody, link: href }),
  ]).then(() => undefined);
}

export function notifyReviewReceived(
  contractorId: string,
  jobId: string,
  rating: number
) {
  const title = `You got a ${rating}★ review!`;
  const body  = "A homeowner left you a review. Check your profile.";
  const href  = `/contractor-profile`;
  return Promise.all([
    createNotification({ recipientId: contractorId, type: "review_received", title, body, jobId, href }),
    sendEmail(contractorId, { type: "review_received", rating, jobId }),
    sendPush(contractorId, { title, body, href, jobId, type: "review_received" }),
  ]).then(() => undefined);
}

export function notifyPayoutFailed(
  contractorId: string,
  jobId: string,
  failureReason?: string
) {
  const title = "Payout failed";
  const body = failureReason
    ? `Payout for this job failed: ${failureReason}. Contact support for help.`
    : "Payout for this job couldn't go through. Check your payment method in settings.";
  const href = `/dashboard/contractor/earnings`;
  const smsBody = `⚠️ Payout failed. ${failureReason || "Check your payment method."} ${process.env.NEXT_PUBLIC_APP_URL || 'https://repair-ai-pro.vercel.app'}/dashboard/contractor/earnings`;
  return Promise.all([
    createNotification({ recipientId: contractorId, type: "payout_failed", title, body, jobId, href }),
    sendEmail(contractorId, { type: "payout_failed", failureReason, jobId }),
    sendPush(contractorId, { title, body, href, jobId, type: "payout_failed", requireInteraction: true }),
    sendSMS(contractorId, { title, body: smsBody, link: href }),
  ]).then(() => undefined);
}
