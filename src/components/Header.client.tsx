'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/db';
import { MessageSquare, Bell, LayoutDashboard, Briefcase, Users, LogOut, Plus, Menu, X } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "").split(",").map(s => s.trim()).filter(Boolean);

export default function Header() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAdmin = !!user && (ADMIN_UIDS.includes(user.uid) || user.email?.endsWith("@repair-ai.admin"));

  // Scroll detection for header shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Unread messages listener
  useEffect(() => {
    if (!user) return;
    let active = true;
    const listeners: (() => void)[] = [];

    function watchJobs(jobIds: string[]) {
      jobIds.forEach(jobId => {
        const q = query(collection(db, 'jobs', jobId, 'messages'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
          if (!active || snap.empty) return;
          const last = snap.docs[0].data();
          if (last?.senderId && last.senderId !== user.uid) {
            setUnreadCount(n => n + 1);
          }
        });
        listeners.push(unsub);
      });
    }

    const u1 = onSnapshot(query(collection(db, 'jobs'), where('userId', '==', user.uid)), snap => watchJobs(snap.docs.map(d => d.id)));
    const u2 = onSnapshot(query(collection(db, 'jobs'), where('claimedBy', '==', user.uid)), snap => watchJobs(snap.docs.map(d => d.id)));

    return () => { active = false; u1(); u2(); listeners.forEach(f => f()); };
  }, [user]);

  const navLinks = user ? [
    { href: '/jobs/new',                    label: 'Post Job',    icon: Plus,            highlight: true },
    { href: '/jobs',                        label: 'Marketplace', icon: Briefcase,       highlight: false },
    { href: '/contractor',                  label: 'Contractors', icon: Users,           highlight: false },
    { href: '/contractor-inbox',            label: 'Inbox',       icon: Bell,            highlight: false },
    { href: '/dashboard',                   label: 'Dashboard',   icon: LayoutDashboard, highlight: false },
  ] : [
    { href: '/jobs',              label: 'Marketplace', icon: Briefcase,       highlight: false },
    { href: '/contractor',        label: 'Contractors', icon: Users,           highlight: false },
  ];

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-all duration-200"
        style={{
          boxShadow: scrolled ? '0 1px 40px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-indigo-500/50 transition-all duration-300">
              <span className="text-white text-sm font-bold">⚡</span>
            </div>
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--color-text)' }}>
              Repair<span style={{ color: '#818cf8' }}>AI</span>
              <span className="hidden sm:inline" style={{ color: 'var(--color-text-3)', fontWeight: 500 }}> Pro</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {navLinks.map(({ href, label, highlight }) =>
              highlight ? (
                <Link key={href} href={href} className="btn btn-primary btn-sm ml-1">
                  <Plus className="w-3.5 h-3.5" />
                  {label}
                </Link>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{ color: 'var(--color-text-3)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {label}
                </Link>
              )
            )}
          </nav>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-1.5">
            {user ? (
              <>
                {/* Chat icon */}
                <Link
                  href="/chat"
                  className="relative p-2 rounded-lg transition-all duration-150"
                  style={{ color: 'var(--color-text-3)' }}
                  title="Messages"
                >
                  <MessageSquare className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <NotificationCenter />

                {/* Admin */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                    style={{
                      color: '#fb923c',
                      background: 'rgba(249,115,22,0.1)',
                      border: '1px solid rgba(249,115,22,0.25)',
                    }}
                  >
                    Admin
                  </Link>
                )}

                {/* User avatar + sign out */}
                <div className="flex items-center gap-1.5 ml-1 pl-1.5" style={{ borderLeft: '1px solid var(--color-border)' }}>
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-full ring-1"
                      style={{ outline: '1px solid var(--color-border)' }}
                    />
                  )}
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ color: 'var(--color-text-4)' }}
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
                  style={{ color: 'var(--color-text-3)' }}
                >
                  Sign in
                </Link>
                <Link href="/auth/signin" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: icons + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <>
                <Link href="/chat" className="relative p-1.5" style={{ color: 'var(--color-text-3)' }}>
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <NotificationCenter />
              </>
            )}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--color-text-3)', background: mobileOpen ? 'var(--color-surface)' : 'transparent' }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-14 left-0 right-0 p-4 space-y-1 animate-fade-in"
            style={{
              background: 'rgba(14, 17, 23, 0.98)',
              backdropFilter: 'blur(24px)',
              borderBottom: '1px solid var(--color-border)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {navLinks.map(({ href, label, icon: Icon, highlight }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: highlight ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: highlight ? '#a5b4fc' : 'var(--color-text-2)',
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            <div className="pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              {user ? (
                <button
                  onClick={() => { logout?.(); setMobileOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm w-full transition-all"
                  style={{ color: 'var(--color-text-3)' }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              ) : (
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold btn-primary"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
