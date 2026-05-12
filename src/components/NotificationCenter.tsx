"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection, query, orderBy, limit,
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
  new_bid:            "🎯",
  job_accepted:       "🎉",
  job_started:        "🔧",
  job_completed:      "✅",
  job_confirmed:      "🌟",
  payment_released:   "💸",
  new_message:        "💬",
  review_received:    "⭐",
  bid_selected:       "🏆",
  bid_declined:       "❌",
  dispute_opened:     "⚠️",
  job_cancelled:      "❌",
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

  /* ── Real-time notifications from notifications/{uid}/items ── */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => {});
    return () => unsub();
  }, [user]);

  /* ── Close on outside click ── */
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

  /* ── Sync unread count for PWA badge ── */
  useEffect(() => {
    try {
      localStorage.setItem("notif:unread", String(unread));
      window.dispatchEvent(new CustomEvent("notif:updated", { detail: { unread } }));
    } catch { /* ignore */ }
  }, [unread]);

  async function markRead(notif: Notif) {
    if (!user) return;
    if (!notif.read) {
      await updateDoc(
        doc(db, "notifications", user.uid, "items", notif.id),
        { read: true }
      ).catch(() => {});
    }
    setOpen(false);
    if (notif.href) router.push(notif.href);
  }

  async function markAllRead() {
    if (!user) return;
    const unreadItems = notifs.filter((n) => !n.read);
    if (!unreadItems.length) return;
    const batch = writeBatch(db);
    unreadItems.forEach((n) =>
      batch.update(doc(db, "notifications", user.uid, "items", n.id), { read: true })
    );
    await batch.commit().catch(() => {});
  }

  if (!user) return null;

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          padding: "7px 8px",
          borderRadius: 8,
          background: open ? "var(--color-surface)" : "transparent",
          border: "1px solid",
          borderColor: open ? "var(--color-border)" : "transparent",
          color: unread > 0 ? "var(--color-brand)" : "var(--color-text-4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          transition: "all 0.15s",
        }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#ef4444", color: "#fff",
            fontSize: 9, fontWeight: 800,
            width: 16, height: 16, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--color-bg)",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute",
          right: 0, top: "calc(100% + 8px)",
          width: 320,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
          zIndex: 1000,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: "1px solid var(--color-border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
                Notifications
              </h3>
              {unread > 0 && (
                <span style={{
                  background: "#ef4444", color: "#fff",
                  fontSize: 9, fontWeight: 800,
                  padding: "2px 6px", borderRadius: 9999,
                }}>
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 11, color: "var(--color-brand)",
                  background: "none", border: "none",
                  cursor: "pointer", fontWeight: 500,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
                <p style={{ fontSize: 13, color: "var(--color-text-4)" }}>No notifications yet</p>
                <p style={{ fontSize: 11, color: "var(--color-text-4)", marginTop: 4 }}>
                  We'll let you know when something happens
                </p>
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    display: "flex",
                    gap: 12,
                    background: !n.read ? "rgba(99,102,241,0.06)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--color-border)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = !n.read ? "rgba(99,102,241,0.06)" : "transparent")}
                >
                  {/* Icon */}
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>
                    {TYPE_ICON[n.type] ?? "🔔"}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, lineHeight: 1.4,
                      fontWeight: !n.read ? 600 : 400,
                      color: !n.read ? "var(--color-text)" : "var(--color-text-3)",
                      marginBottom: 2,
                    }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p style={{
                        fontSize: 11, color: "var(--color-text-4)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {n.body}
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: "var(--color-text-4)", marginTop: 4 }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "var(--color-brand)",
                      flexShrink: 0, marginTop: 5,
                    }} />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            borderTop: "1px solid var(--color-border)",
            padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <button
              onClick={() => { setOpen(false); router.push('/notifications'); }}
              style={{
                fontSize: 12, color: "var(--color-brand)",
                background: "none", border: "none", cursor: "pointer",
                fontWeight: 600,
              }}
            >
              View all notifications →
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                fontSize: 12, color: "var(--color-text-4)",
                background: "none", border: "none", cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
