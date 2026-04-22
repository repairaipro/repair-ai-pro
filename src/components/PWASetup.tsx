'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { registerServiceWorker, updateBadgeCount, onInstallPrompt } from '@/lib/pwa';
import { getFCMToken, onForegroundMessage } from '@/lib/fcm-client';

/**
 * PWA Setup Component
 * - Registers service worker on mount
 * - Registers FCM push token when user logs in
 * - Handles foreground push messages (dispatches custom event for NotificationCenter)
 * - Updates home screen badge with unread count
 */
export default function PWASetup() {
  const { user } = useAuth();
  const registeredTokenRef = useRef<string | null>(null);

  // Register service worker and set up PWA features
  useEffect(() => {
    registerServiceWorker();
    onInstallPrompt(() => {
      // Install prompt captured — browser may show native prompt
    });
  }, []);

  // Register FCM token whenever a user logs in
  useEffect(() => {
    if (!user) {
      registeredTokenRef.current = null;
      return;
    }

    async function registerPush() {
      try {
        const token = await getFCMToken();
        if (!token || token === registeredTokenRef.current) return;

        const idToken = await user!.getIdToken();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token }),
        });

        registeredTokenRef.current = token;
      } catch (err) {
        console.warn('FCM token registration failed (non-fatal):', err);
      }
    }

    registerPush();
  }, [user]);

  // Handle foreground push messages — show as in-app toast via custom event
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      window.dispatchEvent(
        new CustomEvent('push:foreground', { detail: payload })
      );
    });
    return unsubscribe;
  }, []);

  // Sync badge count with unread notification count
  useEffect(() => {
    if (!user) {
      updateBadgeCount(0);
      return;
    }

    const unreadCount = parseInt(localStorage.getItem('notif:unread') || '0', 10);
    updateBadgeCount(unreadCount);

    const handleNotifUpdate = (e: Event) => {
      const count = (e as CustomEvent).detail?.unread || 0;
      updateBadgeCount(count);
    };

    window.addEventListener('notif:updated', handleNotifUpdate);
    return () => window.removeEventListener('notif:updated', handleNotifUpdate);
  }, [user]);

  return null;
}
