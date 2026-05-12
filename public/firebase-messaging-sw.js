importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Config is injected at runtime via the query string on the SW registration URL.
// See PushNotificationBanner.tsx for how this is done.
self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG") {
    firebase.initializeApp(event.data.config);
    firebase.messaging();
  }
});

// Background message handler — shows notification when app tab is not focused.
self.addEventListener("push", (event) => {
  try {
    const data = event.data?.json();
    const title = data?.notification?.title ?? data?.data?.title ?? "RepairAI Pro";
    const body  = data?.notification?.body  ?? data?.data?.body  ?? "";
    const href  = data?.data?.href ?? data?.fcmOptions?.link ?? "/";

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon:   "/icon-192x192.png",
        badge:  "/icon-192x192.png",
        data:   { href },
        requireInteraction: false,
      })
    );
  } catch (_) {
    // Fallback — let firebase-messaging-compat handle it
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(href);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(href);
    })
  );
});
