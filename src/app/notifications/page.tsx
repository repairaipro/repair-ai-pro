'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, writeBatch,
} from 'firebase/firestore';
import Link from 'next/link';
import {
  Bell, CheckCheck, BriefcaseBusiness, MessageSquare,
  Star, DollarSign, AlertTriangle, Zap, Trophy,
  ChevronRight, Inbox,
} from 'lucide-react';

/* ─── Types ── */
type Notif = {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: any;
  jobId?: string;
  href?: string;
  link?: string;
};

/* ─── Helpers ── */
function timeAgo(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  new_bid: {
    icon: <Trophy className="w-4 h-4" />,
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)',
  },
  bid_selected: {
    icon: <CheckCheck className="w-4 h-4" />,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
  },
  bid_declined: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: '#f87171',
    bg: 'rgba(239,68,68,0.1)',
  },
  job_started: {
    icon: <Zap className="w-4 h-4" />,
    color: '#818cf8',
    bg: 'rgba(99,102,241,0.12)',
  },
  job_completed: {
    icon: <BriefcaseBusiness className="w-4 h-4" />,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
  },
  job_confirmed: {
    icon: <DollarSign className="w-4 h-4" />,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
  },
  new_message: {
    icon: <MessageSquare className="w-4 h-4" />,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
  },
  new_review: {
    icon: <Star className="w-4 h-4" />,
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)',
  },
  invitation: {
    icon: <Inbox className="w-4 h-4" />,
    color: '#fb923c',
    bg: 'rgba(249,115,22,0.1)',
  },
};

const DEFAULT_CONFIG = {
  icon: <Bell className="w-4 h-4" />,
  color: 'var(--color-brand)',
  bg: 'rgba(99,102,241,0.1)',
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
}

/* ─── Main ── */
export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifs,  setNotifs]  = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  async function markRead(notif: Notif) {
    if (!user || notif.read) return;
    await updateDoc(doc(db, 'notifications', user.uid, 'items', notif.id), { read: true });
  }

  async function markAllRead() {
    if (!user) return;
    const unread = notifs.filter((n) => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', user.uid, 'items', n.id), { read: true });
    });
    await batch.commit();
  }

  const filtered = filter === 'unread' ? notifs.filter((n) => !n.read) : notifs;
  const unreadCount = notifs.filter((n) => !n.read).length;

  const getHref = (n: Notif): string => {
    if (n.href)  return n.href;
    if (n.link)  return n.link;
    if (n.jobId) {
      if (n.type === 'new_message') return `/chat/${n.jobId}`;
      return `/jobs/${n.jobId}`;
    }
    return '#';
  };

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--color-brand)', color: '#fff' }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
              Activity across your jobs and bids
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-medium flex items-center gap-1.5"
              style={{ color: 'var(--color-brand)' }}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2 text-sm font-medium capitalize transition-colors"
              style={
                filter === f
                  ? { background: 'var(--color-brand)', color: '#fff' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-3)' }
              }
            >
              {f === 'unread' && unreadCount > 0 ? `Unread (${unreadCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl animate-pulse"
                style={{ background: 'var(--color-surface)' }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-4)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-2)' }}>
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Notifications about your jobs and bids will appear here.'}
            </p>
          </div>
        )}

        {/* Notification list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-1.5">
            {filtered.map((n) => {
              const cfg  = getConfig(n.type);
              const href = getHref(n);
              return (
                <Link
                  key={n.id}
                  href={href}
                  onClick={() => markRead(n)}
                  className="flex items-start gap-3 rounded-2xl px-4 py-3.5 transition-all block"
                  style={{
                    background: n.read ? 'var(--color-surface)' : `${cfg.bg}`,
                    border: n.read
                      ? '1px solid var(--color-border)'
                      : `1px solid ${cfg.color}30`,
                    textDecoration: 'none',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-snug"
                      style={{
                        color: 'var(--color-text)',
                        fontWeight: n.read ? 400 : 600,
                      }}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-4)' }}>
                        {n.body}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot + chevron */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                    {!n.read && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: cfg.color }}
                      />
                    )}
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
