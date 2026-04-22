/**
 * Server-side FCM push notification helper.
 * Uses Firebase Admin Messaging to send push to a user's registered devices.
 *
 * Call from API routes only (server-side).
 */

import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";

export type PushPayload = {
  title: string;
  body: string;
  href?: string;
  jobId?: string;
  type?: string;
  /** Require the user to interact with the notification before it dismisses */
  requireInteraction?: boolean;
};

/**
 * Send a push notification to all registered devices for a user.
 * Silently drops invalid/expired tokens.
 */
export async function sendPush(uid: string, payload: PushPayload): Promise<void> {
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const tokens: string[] = userDoc.data()?.fcmTokens ?? [];

    if (!tokens.length) return;

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        href: payload.href ?? "/",
        jobId: payload.jobId ?? "",
        type: payload.type ?? "",
      },
      webpush: {
        notification: {
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          requireInteraction: payload.requireInteraction ?? false,
        },
        fcmOptions: {
          link: payload.href ?? "/",
        },
      },
    };

    // Send to all devices in parallel, collect results
    const results = await Promise.allSettled(
      tokens.map((token) =>
        adminMessaging.send({ ...message, token })
      )
    );

    // Prune tokens that are no longer valid (uninstalled app, revoked, etc.)
    const staleTokens: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const code = (result.reason as any)?.errorInfo?.code ?? "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          staleTokens.push(tokens[i]);
        }
      }
    });

    if (staleTokens.length) {
      await adminDb
        .collection("users")
        .doc(uid)
        .update({
          fcmTokens: tokens.filter((t) => !staleTokens.includes(t)),
        });
    }
  } catch (err) {
    // Non-fatal — push is best-effort
    console.warn("sendPush error (non-fatal):", err);
  }
}
