'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/db';
import { MessageSquare } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export default function Header() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen]   = useState(false);

  const isAdmin = !!user && (ADMIN_UIDS.includes(user.uid) || user.email?.endsWith("@repair-ai.admin"));

  // Listen for unread messages across all the user's jobs
  useEffect(() => {
    if (!user) return;

    let active = true;
    const listeners: (() => void)[] = [];

    function watchJobs(jobIds: string[]) {
      jobIds.forEach((jobId) => {
        const q = query(
          collection(db, 'jobs', jobId, 'messages'),
          orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
          if (!active || snap.empty) return;
          const last = snap.docs[0].data();
          if (last?.senderId && last.senderId !== user.uid) {
            setUnreadCount((n) => n + 1);
          }
        });
        listeners.push(unsub);
      });
    }

    const u1 = onSnapshot(
      query(collection(db, 'jobs'), where('userId',    '==', user.uid)),
      (snap) => watchJobs(snap.docs.map((d) => d.id))
    );
    const u2 = onSnapshot(
      query(collection(db, 'jobs'), where('claimedBy', '==', user.uid)),
      (snap) => watchJobs(snap.docs.map((d) => d.id))
    );

    return () => { active = false; u1(); u2(); listeners.forEach((f) => f()); };
  }, [user]);

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:text-indigo-400 transition flex-shrink-0">
          <span className="text-indigo-400">⚡</span>
          <span>Repair AI Pro</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/jobs/new"         className="px-3 py-1.5 text-sm hover:bg-gray-800 hover:text-indigo-400 rounded-lg transition">Post Job</Link>
          <Link href="/jobs"             className="px-3 py-1.5 text-sm hover:bg-gray-800 hover:text-indigo-400 rounded-lg transition text-gray-400">Marketplace</Link>
          <Link href="/contractor"       className="px-3 py-1.5 text-sm hover:bg-gray-800 hover:text-indigo-400 rounded-lg transition text-gray-400">Contractors</Link>

          {user ? (
            <>
              <Link href="/contractor-inbox" className="px-3 py-1.5 text-sm hover:bg-gray-800 hover:text-indigo-400 rounded-lg transition text-gray-400">My Inbox</Link>
              <Link href="/dashboard"        className="px-3 py-1.5 text-sm hover:bg-gray-800 hover:text-indigo-400 rounded-lg transition text-gray-400">Dashboard</Link>

              {/* Chat icon with unread badge */}
              <Link href="/chat" className="relative p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-indigo-400">
                <MessageSquare className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Notification bell */}
              <NotificationCenter />

              {/* Admin link — only for admins */}
              {isAdmin && (
                <Link href="/admin" className="px-3 py-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 border border-orange-800/60 hover:border-orange-600 rounded-lg transition">
                  Admin
                </Link>
              )}

              <button
                onClick={logout}
                className="ml-2 text-sm text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition">Sign in</Link>
              <Link
                href="/jobs/new"
                className="ml-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile: chat icon + notifications + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          {user && (
            <>
              <Link href="/chat" className="relative p-1.5 text-gray-400 hover:text-white">
                <MessageSquare className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <NotificationCenter />
            </>
          )}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-1.5 text-gray-400 hover:text-white"
            aria-label="Toggle menu"
          >
            <div className="space-y-1">
              <span className={`block w-5 h-0.5 bg-current transition-transform ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-5 h-0.5 bg-current transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-current transition-transform ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-3 space-y-1">
          {[
            { href: '/jobs/new',         label: 'Post Job',       bold: true  },
            { href: '/jobs',             label: 'Marketplace',    bold: false },
            { href: '/contractor',       label: 'Contractors',    bold: false },
            ...(user ? [
              { href: '/contractor-inbox', label: 'My Inbox',       bold: false },
              { href: '/dashboard',        label: 'Dashboard',      bold: false },
            ] : []),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm transition hover:bg-gray-800 ${item.bold ? 'text-white font-semibold' : 'text-gray-400'}`}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={() => { logout?.(); setMobileOpen(false); }}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800 transition"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/auth/signin"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-indigo-400 font-medium hover:bg-gray-800 transition"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
