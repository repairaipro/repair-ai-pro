const CACHE_NAME = 'repair-ai-pro-v1';
const RUNTIME_CACHE = 'repair-ai-pro-runtime';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install: cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Gracefully handle failures for non-critical assets
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME && name !== RUNTIME_CACHE) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls (let them fail if offline)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Network-first strategy for HTML/CSS/JS
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) return response;

        const cache_name = request.destination === 'document' ? CACHE_NAME : RUNTIME_CACHE;
        const responseClone = response.clone();
        caches.open(cache_name).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notification: show notification with action buttons
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let notifData = { title: 'Repair AI Pro', body: 'New notification' };

  try {
    notifData = event.data.json();
  } catch (e) {
    notifData.body = event.data.text();
  }

  const options = {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: notifData.tag || 'default',
    requireInteraction: notifData.requireInteraction || false,
    data: notifData.data || {},
    actions: notifData.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(notifData.title, options)
  );
});

// Notification click: navigate to the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const href = event.notification.data.href || '/';
  const action = event.action;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (let client of clientList) {
        if (client.url === href && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(href);
      }
    })
  );
});

// Badge API: update home screen icon badge count
// Called from client via setAppBadge()
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    const count = event.data.count || 0;
    if (navigator.setAppBadge) {
      if (count > 0) {
        navigator.setAppBadge(count);
      } else {
        navigator.clearAppBadge?.();
      }
    }
  }
});
