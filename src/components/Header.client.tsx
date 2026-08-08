'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/db';
import { useIsContractor, useActiveMode } from '@/lib/useRole';
import { Bell, LayoutDashboard, Briefcase, Users, LogOut, Plus, Menu, X, Inbox, Calendar, Clapperboard, HardHat, Home } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import ChatBubbleIcon from '@/components/ChatBubbleIcon';
import ProfileMenu from '@/components/ProfileMenu.client';

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "").split(",").map(s => s.trim()).filter(Boolean);

/** Compact two-way switch for dual-role accounts — the explicit "which side
 * am I on right now" control that was missing entirely before. */
function ModeToggle({ mode, setMode }: { mode: 'homeowner' | 'contractor'; setMode: (m: 'homeowner' | 'contractor') => void }) {
  const options: { value: 'homeowner' | 'contractor'; label: string; icon: React.ReactNode }[] = [
    { value: 'homeowner', label: 'Homeowner', icon: <Home className="w-3 h-3" /> },
    { value: 'contractor', label: 'Contractor', icon: <HardHat className="w-3 h-3" /> },
  ];
  return (
    <div
      className="flex items-center p-0.5 rounded-full ml-1"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      role="tablist"
      aria-label="View as"
    >
      {options.map((o) => {
        const active = mode === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setMode(o.value)}
            title={`Switch to ${o.label} view`}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all"
            style={active
              ? { background: o.value === 'contractor' ? 'rgba(52,211,153,0.15)' : 'rgba(99,102,241,0.15)', color: o.value === 'contractor' ? '#34d399' : '#a5b4fc' }
              : { color: 'var(--color-text-4)' }}
          >
            {o.icon}
            <span className="hidden lg:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { isContractor: hasContractor } = useIsContractor();
  const { mode, setMode } = useActiveMode(hasContractor);
  // The nav shows whichever side the person is currently viewing, not just
  // whichever role they happen to hold — see useActiveMode for why those
  // are different. `hasContractor` is the underlying capability (does a
  // contractors/{uid} doc exist); `mode` is "homeowner" for everyone until
  // a dual-role user explicitly switches, via the toggle below.
  const isContractor = hasContractor && mode === 'contractor';
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

  // Unread messages badge: count jobs whose most recent message was sent by
  // the other party. Stateless per snapshot — recomputed from a jobId→bool
  // map rather than incremented, so it can't drift or double-count. Each
  // job gets exactly one listener (limit(1) = last message only); listeners
  // are keyed by jobId so re-fires of the jobs query never attach duplicates.
  const msgListeners = useRef<Map<string, () => void>>(new Map());
  const unreadByJob = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!user) return;
    const listeners = msgListeners.current;
    const unread = unreadByJob.current;

    const recount = () => setUnreadCount([...unread.values()].filter(Boolean).length);

    function watchJobs(jobIds: string[]) {
      jobIds.forEach(jobId => {
        if (listeners.has(jobId)) return; // already watching
        const q = query(collection(db, 'jobs', jobId, 'messages'), orderBy('createdAt', 'desc'), limit(1));
        const unsub = onSnapshot(q, snap => {
          const last = snap.docs[0]?.data();
          unread.set(jobId, !!last?.senderId && last.senderId !== user!.uid);
          recount();
        }, () => {});
        listeners.set(jobId, unsub);
      });
    }

    const u1 = onSnapshot(query(collection(db, 'jobs'), where('userId', '==', user.uid)), snap => watchJobs(snap.docs.map(d => d.id)), () => {});
    const u2 = onSnapshot(query(collection(db, 'jobs'), where('claimedBy', '==', user.uid)), snap => watchJobs(snap.docs.map(d => d.id)), () => {});

    return () => {
      u1(); u2();
      listeners.forEach(f => f());
      listeners.clear();
      unread.clear();
    };
  }, [user]);

  // Role-aware navigation: each side of the marketplace gets its own
  // primary actions. Contractors live in Inbox/Studio/Schedule; homeowners
  // post jobs and track their own. Before the role resolves (one cached
  // Firestore read) we show the homeowner set — it flips in <100ms.
  const navLinks = user ? (isContractor ? [
    { href: '/contractor-inbox',  label: 'Inbox',       icon: Inbox,           highlight: true },
    { href: '/jobs',              label: 'Marketplace', icon: Briefcase,       highlight: false },
    { href: '/studio',            label: 'Studio',      icon: Clapperboard,    highlight: false },
    { href: '/contractor/schedule', label: 'Schedule',  icon: Calendar,        highlight: false },
    { href: '/dashboard',         label: 'Dashboard',   icon: LayoutDashboard, highlight: false },
  ] : [
    { href: '/jobs/new',          label: 'Post Job',    icon: Plus,            highlight: true },
    { href: '/my-jobs',           label: 'My Jobs',     icon: Briefcase,       highlight: false },
    { href: '/contractor',        label: 'Contractors', icon: Users,           highlight: false },
    { href: '/dashboard',         label: 'Dashboard',   icon: LayoutDashboard, highlight: false },
  ]) : [
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
            {navLinks.map(({ href, label, icon: Icon, highlight }) =>
              highlight ? (
                <Link key={href} href={href} className="btn btn-primary btn-sm ml-1">
                  <Icon className="w-3.5 h-3.5" />
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
                  className="relative p-2 rounded-lg transition-transform duration-150 hover:scale-110"
                  title="Messages"
                >
                  <ChatBubbleIcon size={21} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                      style={{ background: '#ef4444', border: '2px solid var(--color-bg)' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <NotificationCenter />

                {/* Homeowner/Contractor mode toggle — only shown once someone
                    actually has both roles; a single-role account has nothing
                    to switch to, so this stays out of their way entirely. */}
                {hasContractor && <ModeToggle mode={mode} setMode={setMode} />}

                {/* Profile menu — avatar, role badge, primary links, sign out */}
                <div className="ml-1 pl-1.5" style={{ borderLeft: '1px solid var(--color-border)' }}>
                  <ProfileMenu isAdmin={isAdmin} />
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
                <Link href="/chat" className="relative p-1.5" title="Messages">
                  <ChatBubbleIcon size={23} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                      style={{ background: '#ef4444', border: '2px solid var(--color-bg)' }}
                    >
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
              background: 'var(--color-bg)',
              backdropFilter: 'blur(24px)',
              borderBottom: '1px solid var(--color-border)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {user && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 mb-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" style={{ outline: '1px solid var(--color-border)' }} />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
                    {(user.displayName || user.email || '?').trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{user.displayName || user.email}</p>
                  <span
                    className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
                    style={isContractor
                      ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' }
                      : { color: '#818cf8', background: 'rgba(99,102,241,0.12)' }}
                  >
                    {isContractor ? 'Contractor' : 'Homeowner'}
                  </span>
                </div>
              </div>
            )}
            {hasContractor && (
              <div className="px-4 pb-2">
                <ModeToggle mode={mode} setMode={setMode} />
              </div>
            )}
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
