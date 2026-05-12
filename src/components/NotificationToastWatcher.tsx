'use client';

import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { useToast, ToastType } from './ToastProvider';

const TYPE_MAP: Record<string, { type: ToastType; emoji?: string }> = {
  contractor_invited: { type: 'bid',     emoji: '📬' },
  new_bid:            { type: 'bid',     emoji: '🎯' },
  job_accepted:       { type: 'success', emoji: '🎉' },
  job_started:        { type: 'info',    emoji: '🔧' },
  job_completed:      { type: 'info',    emoji: '✅' },
  job_confirmed:      { type: 'money',   emoji: '💸' },
  payment_released:   { type: 'money',   emoji: '💸' },
  new_message:        { type: 'info',    emoji: '💬' },
  review_received:    { type: 'review',  emoji: '⭐' },
  bid_selected:       { type: 'success', emoji: '🏆' },
  bid_declined:       { type: 'warning', emoji: '❌' },
};

/**
 * Runs invisibly in the background.
 * Watches the user's `notifications` Firestore subcollection and fires a toast
 * for each new unread notification that arrives after page load.
 */
export default function NotificationToastWatcher() {
  const { user }    = useAuth();
  const { addToast } = useToast();
  const seenIds      = useRef<Set<string>>(new Set());
  const initialized  = useRef(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      // On first load, seed seenIds without toasting anything
      if (!initialized.current) {
        snap.docs.forEach((d) => seenIds.current.add(d.id));
        initialized.current = true;
        return;
      }

      // Only toast new docs that weren't already known
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const id   = change.doc.id;
        if (seenIds.current.has(id)) return;
        seenIds.current.add(id);

        const data = change.doc.data() as any;
        if (data.read) return; // already read — skip toast

        const cfg   = TYPE_MAP[data.type] ?? { type: 'info' };
        const title = data.title
          ? (cfg.emoji ? `${cfg.emoji} ${data.title}` : data.title)
          : 'New notification';

        addToast({
          type:     cfg.type,
          title,
          body:     data.body ?? undefined,
          href:     data.href ?? (data.jobId ? `/jobs/${data.jobId}` : undefined),
          duration: 6000,
        });
      });
    });

    return unsub;
  }, [user, addToast]);

  return null;
}
