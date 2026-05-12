"use client";

import { useEffect, useState } from "react";
import { Bell, X, BellOff, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

type State = "idle" | "requesting" | "subscribed" | "denied" | "unsupported" | "dismissed";

export function PushNotificationBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    // Don't show if already dismissed this session
    if (typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("push-banner-dismissed") === "1") {
      setState("dismissed");
      return;
    }
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      // Already have permission — silently register token if needed
      registerToken().catch(() => {});
      setState("subscribed");
    } else if (Notification.permission === "denied") {
      setState("denied");
    }
  }, [user]);

  async function registerToken() {
    if (!user) return;
    try {
      const { getMessaging, getToken } = await import("firebase/messaging");
      const { default: app } = await import("@/lib/db");

      const sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

      // Send firebase config to the SW so it can initialise
      const config = {
        apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      sw.active?.postMessage({ type: "FIREBASE_CONFIG", config });

      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey:          process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: sw,
      });

      if (!token) return;

      const idToken = await user.getIdToken();
      await fetch("/api/push/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body:    JSON.stringify({ token }),
      });
    } catch (err) {
      console.warn("Push token registration failed (non-fatal):", err);
    }
  }

  async function handleEnable() {
    if (!user) return;
    setState("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await registerToken();
        setState("subscribed");
      } else {
        setState("denied");
      }
    } catch {
      setState("denied");
    }
  }

  function handleDismiss() {
    sessionStorage.setItem("push-banner-dismissed", "1");
    setState("dismissed");
  }

  // Only show the prompt banner when permission is default (not yet asked)
  if (
    state === "dismissed" ||
    state === "unsupported" ||
    state === "subscribed" ||
    (typeof Notification !== "undefined" && Notification.permission !== "default" && state === "idle")
  ) {
    return null;
  }

  if (state === "denied") {
    return null; // Can't prompt again — browser blocks re-asking
  }

  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.25)',
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--color-brand-dim)' }}
      >
        {state === "requesting"
          ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--color-brand)' }} />
          : <Bell size={15} style={{ color: 'var(--color-brand)' }} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Enable push notifications
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)', lineHeight: 1.5 }}>
          Get instant alerts for new bids, messages, and job updates — even when the tab is closed.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          disabled={state === "requesting"}
          className="btn btn-primary btn-sm"
        >
          {state === "requesting" ? "Enabling…" : "Enable"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-4)' }}
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
