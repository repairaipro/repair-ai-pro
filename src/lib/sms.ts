/**
 * Server-side SMS notifications via Twilio.
 * Call from API routes only.
 *
 * Requires: npm install twilio
 * Env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import { adminDb } from "@/lib/firebaseAdmin";

// Lazy-init Twilio client
let _twilio: any = null;

function getTwilio(): any | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  if (!_twilio) {
    try {
      const Twilio = require("twilio");
      _twilio = new Twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (err) {
      console.warn("Twilio not installed. Run: npm install twilio");
      return null;
    }
  }

  return _twilio;
}

export type SMSPayload = {
  title: string;
  body: string;
  link?: string;
  jobId?: string;
};

/**
 * Send SMS to a user (contractor or homeowner).
 * Looks up phone from contractors/{uid} or users/{uid}.
 * Non-fatal on failure — logs warning but doesn't throw.
 */
export async function sendSMS(uid: string, payload: SMSPayload): Promise<void> {
  const twilio = getTwilio();
  if (!twilio) return; // Twilio not configured

  try {
    let phone: string | undefined;

    // Try contractor first
    const contractorSnap = await adminDb.collection("contractors").doc(uid).get();
    if (contractorSnap.exists()) {
      phone = contractorSnap.data()?.phone;
    }

    // Fall back to user
    if (!phone) {
      const userSnap = await adminDb.collection("users").doc(uid).get();
      phone = userSnap.data()?.phone;
    }

    if (!phone) {
      console.warn(`SMS: no phone for ${uid}`);
      return;
    }

    // Format message: title + body + link (keep under 320 chars)
    let message = `${payload.title}\n${payload.body}`;
    if (payload.link) {
      message += `\n\n${payload.link}`;
    }

    // Cap at 320 chars (SMS limit)
    if (message.length > 320) {
      message = message.slice(0, 317) + "...";
    }

    // Send via Twilio
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`SMS sent to ${uid}`);
  } catch (err) {
    console.warn("sendSMS error (non-fatal):", err);
  }
}
