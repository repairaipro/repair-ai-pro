'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { collection, query, orderBy, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { Check, AlertCircle, Info, X } from 'lucide-react';

type NotificationRecord = {
  id: string;
  type: 'arrival' | 'departure' | 'status_update' | 'info';
  title: string;
  body: string;
  timestamp: any;
  read: boolean;
  status?: string;
};

type Props = {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function NotificationHistory({ jobId, isOpen, onClose }: Props) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    setLoading(true);
    const constraints: QueryConstraint[] = [
      orderBy('timestamp', 'desc'),
    ];

    const q = query(
      collection(db, 'jobs', jobId, 'notificationHistory'),
      ...constraints
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        setNotifications(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notification history:', error);
        setLoading(false);
      }
    );

    return unsub;
  }, [jobId, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-96 rounded-2xl p-4 space-y-3 overflow-y-auto"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sticky top-0" style={{ background: 'var(--color-surface)' }}>
          <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>
            Notification History
          </h3>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-4)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <p style={{ color: 'var(--color-text-4)' }} className="text-sm">
              Loading notifications...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && notifications.length === 0 && (
          <div className="text-center py-8">
            <p style={{ color: 'var(--color-text-4)' }} className="text-sm">
              No notifications yet
            </p>
          </div>
        )}

        {/* Notifications List */}
        {!loading && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-2 rounded-lg space-y-1"
                style={{
                  background: 'var(--color-bg)',
                  borderLeft:
                    notif.type === 'arrival'
                      ? '3px solid #22c55e'
                      : notif.type === 'departure'
                        ? '3px solid #ef4444'
                        : notif.type === 'status_update'
                          ? '3px solid #3b82f6'
                          : '3px solid #818cf8',
                }}
              >
                {/* Icon + Title */}
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">
                    {notif.type === 'arrival' && (
                      <Check size={14} style={{ color: '#22c55e' }} />
                    )}
                    {notif.type === 'departure' && (
                      <X size={14} style={{ color: '#ef4444' }} />
                    )}
                    {notif.type === 'status_update' && (
                      <AlertCircle size={14} style={{ color: '#3b82f6' }} />
                    )}
                    {notif.type === 'info' && (
                      <Info size={14} style={{ color: '#818cf8' }} />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      {notif.title}
                    </p>
                    <p className="text-[10px] leading-tight" style={{ color: 'var(--color-text-3)' }}>
                      {notif.body}
                    </p>
                  </div>
                </div>

                {/* Time + Status */}
                <div className="flex items-center justify-between">
                  <p className="text-[9px]" style={{ color: 'var(--color-text-4)' }}>
                    {notif.timestamp
                      ? new Date(notif.timestamp.toDate?.() || notif.timestamp).toLocaleTimeString()
                      : 'Unknown time'}
                  </p>
                  {notif.read === false && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#818cf8' }}
                    />
                  )}
                </div>

                {/* Status Badge */}
                {notif.status && (
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-medium"
                      style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8',
                      }}
                    >
                      {notif.status}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
