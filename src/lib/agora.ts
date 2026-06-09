/**
 * agora.ts — server-side Agora RTC token generation
 *
 * Required env vars:
 *   NEXT_PUBLIC_AGORA_APP_ID   — Agora App ID (safe to expose to client)
 *   AGORA_APP_CERTIFICATE      — Agora App Certificate (server-only, never expose)
 *
 * Token expires in 1 hour by default.
 */

import { RtcTokenBuilder, RtcRole } from 'agora-token';

export const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? '';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE ?? '';

/** Role for the token — publisher can send+receive, subscriber can only receive */
export type AgoraRole = 'publisher' | 'subscriber';

/**
 * Generate an Agora RTC token for a given channel + uid.
 * Must be called server-side only (uses AGORA_APP_CERTIFICATE).
 *
 * @param channelName  Unique channel name (e.g. consultId)
 * @param uid          Numeric user ID (0 = any uid)
 * @param role         'publisher' | 'subscriber'
 * @param expirySeconds  Token validity in seconds (default: 3600 = 1 hour)
 */
export function generateRtcToken(
  channelName: string,
  uid: number,
  role: AgoraRole = 'publisher',
  expirySeconds = 3600,
): string {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error(
      'Agora credentials not configured. Set NEXT_PUBLIC_AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env.local',
    );
  }

  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expireTs  = Math.floor(Date.now() / 1000) + expirySeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    expireTs,
    expireTs,
  );
}

/**
 * Derive a stable numeric UID from a Firebase UID string.
 * Agora requires a uint32 UID — we hash the string into that range.
 */
export function uidFromFirebaseUid(firebaseUid: string): number {
  let hash = 0;
  for (let i = 0; i < firebaseUid.length; i++) {
    hash = (Math.imul(31, hash) + firebaseUid.charCodeAt(i)) | 0;
  }
  // Map to positive uint32
  return Math.abs(hash) % 0xFFFFFF;
}
