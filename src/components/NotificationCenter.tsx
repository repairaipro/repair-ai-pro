"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection, query, where, orderBy, limit,
  onSnapshot, updateDoc, doc, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  href?: string;
  jobId?: string;
  createdAt?: { toDate?: () => Date } | Date;
};

const TYPE_ICON: Record<string, string> = {
  contractor_invited: "📬",
  job_accepted:       "🎉",
  job_started:        "🔧",
  job_completed:      "✅",
  job_confirmed:      "🌟",
  new_message:        "💬",
  review_received:    "⭐",
};

function timeAgo(ts: Notif["createdAt"]): string {
  try {
    const d = typeof (ts as any)?.toDate === "function"
      ? (ts as any).toDate()
      : ts instanceof Date ? ts : null;
    if (!d) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)   return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const router   = useRouter();
  const [notifs,   setNotifs]   = useState<Notif[]>([]);
  const [open,     setOpen]     = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load real-time notifications
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(25)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const unread = notifs.filter((n) => !n.read).length;

  // Sync unread count to localStorage for PWA badge
  useEffect(() => {
    localStorage.setItem('notif:unread', String(unread));
    // Dispatch custom event for other listeners
    window.dispatchEvent(new CustomEvent('notif:updated', { detail: { unread } }));
  }, [unread]);

  async function markRead(notif: Notif) {
    if (!notif.read) {
      await updateDoc(doc(db, "notifications", notif.id), { read: true });
    }
    setOpen(false);
    if (notif.href) router.push(notif.href);
  }

  async function markAllRead() {
    if (!user) return;
    const unreadItems = notifs.filter((n) => !n.read);
    if (!unreadItems.length) return;
    const batch = writeBatch(db);
    unreadItems.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
  }

  if (!user) return null;

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-800 transition text-gray-400 hover:text-white"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">
              Notifications
              {unread > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-800">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-gray-600 text-sm">
                <div className="text-3xl mb-2">🔔</div>
                No notifications yet
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-800 transition ${
                    !n.read ? "bg-indigo-950/30" : ""
                  }`}
                >
                  {/* Icon */}
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {TYPE_ICON[n.type] ?? "🔔"}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!n.read ? "text-white font-semibold" : "text-gray-300"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-gray-700 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="border-t border-gray-800 px-4 py-2.5 text-center">
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-400 transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
