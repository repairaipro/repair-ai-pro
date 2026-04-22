"use client";

/**
 * Client-side FCM utilities.
 * Import only in client components or useEffect hooks — never in server code.
 */

import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import app from "@/lib/db";

let _messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;
  try {
    if (!_messaging) _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
}

/**
 * Request notification permission, then get and return the FCM token.
 * Returns null if permission is denied or the browser doesn't support it.
 */
export async function getFCMToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY;
  if (!vapidKey) {
    console.warn("NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY is not set — push disabled");
    return null;
  }

  const messaging = getMessagingInstance();
  if (!messaging) return null;

  // Must have an active service worker
  if (!("serviceWorker" in navigator)) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return token ?? null;
  } catch (err) {
    console.warn("getFCMToken error:", err);
    return null;
  }
}

/**
 * Register a callback to handle push messages when the app is in the foreground.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function onForegroundMessage(
  callback: (payload: { title: string; body: string; href?: string; type?: string }) => void
): () => void {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title ?? "Repair AI Pro",
      body: payload.notification?.body ?? "",
      href: (payload.data?.href as string) ?? "/",
      type: (payload.data?.type as string) ?? "",
    });
  });

  return unsubscribe;
}
