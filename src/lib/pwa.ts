/**
 * PWA (Progressive Web App) utilities
 * Handles service worker registration, badge updates, and install prompts
 */

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('✅ Service Worker registered');
    return registration;
  } catch (err) {
    console.warn('⚠️ Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Update the home screen badge with unread count
 * This shows a number on the app icon (iOS 16+, Android, desktop)
 */
export async function updateBadgeCount(count: number) {
  if (typeof navigator === 'undefined') return;

  // Badge API support
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge?.();
      }
    } catch (err) {
      console.warn('Badge API error:', err);
    }
  }

  // Fallback: message service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'UPDATE_BADGE',
      count,
    });
  }
}

/**
 * Request notification permission from user
 * Required for push notifications on iOS 16+ and most browsers
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Notification permission request failed:', err);
    return 'denied';
  }
}

/**
 * Subscribe to push notifications
 * Requires service worker registered and notification permission granted
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });

    return subscription;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return null;
  }
}

/**
 * Check if the app is running as standalone (installed on home screen)
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * Listen for the beforeinstallprompt event
 * Used to show a custom "Add to Home Screen" button
 */
export function onInstallPrompt(callback: (event: any) => void) {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event: any) => {
    event.preventDefault();
    callback(event);
  });
}

/**
 * Trigger the native install prompt
 * Call this from a button click after capturing beforeinstallprompt
 */
export async function triggerInstallPrompt(promptEvent: any): Promise<boolean> {
  try {
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    return outcome === 'accepted';
  } catch (err) {
    console.warn('Install prompt failed:', err);
    return false;
  }
}
