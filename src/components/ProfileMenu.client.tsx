'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useIsContractor, useActiveMode } from '@/lib/useRole';
import {
  ChevronDown, LayoutDashboard, Briefcase, Plus, HardHat,
  UserCircle2, LogOut, ShieldCheck, Repeat,
} from 'lucide-react';

/**
 * The header avatar used to be a static <img> with no click handler — clicking
 * it did nothing, and Sign out was a separate icon-only button next to it.
 * This replaces both with one real dropdown: who you are, which side of the
 * marketplace you're on (visible role badge — the second most common
 * confusion after "why can't I click my avatar"), your primary links, and a
 * clear path to pick up the *other* role without creating a second account
 * (post a job as a contractor, or become a pro as a homeowner).
 */
export default function ProfileMenu({ isAdmin }: { isAdmin: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  // hasContractor = capability (does contractors/{uid} exist). mode = which
  // side is currently being viewed. They match for single-role accounts;
  // for dual-role accounts the badge/links below must follow `mode` (what
  // the header nav is showing right now), not the raw capability, or this
  // menu would contradict the nav it's sitting right next to.
  const { isContractor: hasContractor, roleLoaded } = useIsContractor();
  const { mode, setMode } = useActiveMode(hasContractor);
  const isContractor = hasContractor && mode === 'contractor';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();

  const roleBadge = !roleLoaded ? null : isContractor
    ? { label: 'Contractor', icon: <HardHat className="w-3 h-3" />, color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
    : { label: 'Homeowner', icon: <UserCircle2 className="w-3 h-3" />, color: '#818cf8', bg: 'rgba(99,102,241,0.12)' };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 pl-0.5 pr-1.5 py-0.5 rounded-full transition-all"
        style={{ background: open ? 'var(--color-surface)' : 'transparent', border: '1px solid', borderColor: open ? 'var(--color-border)' : 'transparent' }}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-7 h-7 rounded-full"
            style={{ outline: '1px solid var(--color-border)' }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
          >
            {initial}
          </div>
        )}
        <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-xl overflow-hidden z-50 animate-fade-in"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
        >
          {/* Identity header */}
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
              {user.displayName || 'Your account'}
            </p>
            <p className="text-xs truncate mb-2" style={{ color: 'var(--color-text-4)' }}>{user.email}</p>
            {roleBadge && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: roleBadge.color, background: roleBadge.bg }}
              >
                {roleBadge.icon}
                {roleBadge.label}
              </span>
            )}
          </div>

          {/* Primary links */}
          <div className="py-1.5">
            <MenuLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} onClick={() => setOpen(false)}>
              Dashboard
            </MenuLink>
            {isContractor ? (
              <MenuLink href="/studio" icon={<Briefcase className="w-4 h-4" />} onClick={() => setOpen(false)}>
                Studio
              </MenuLink>
            ) : (
              <MenuLink href="/my-jobs" icon={<Briefcase className="w-4 h-4" />} onClick={() => setOpen(false)}>
                My Jobs
              </MenuLink>
            )}

            {hasContractor ? (
              // Already both — switch which side you're viewing, in place,
              // instead of a link that would just navigate without telling
              // the header nav to follow along.
              <button
                type="button"
                onClick={() => {
                  setMode(isContractor ? 'homeowner' : 'contractor');
                  setOpen(false);
                  router.push(isContractor ? '/jobs/new' : '/contractor-inbox');
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left transition-colors"
                style={{ color: 'var(--color-text-2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Repeat className="w-4 h-4" />
                Switch to {isContractor ? 'homeowner' : 'contractor'} view
              </button>
            ) : (
              <MenuLink href="/onboarding/contractor" icon={<HardHat className="w-4 h-4" />} onClick={() => setOpen(false)}>
                Become a pro
              </MenuLink>
            )}
            {isAdmin && (
              <MenuLink href="/admin" icon={<ShieldCheck className="w-4 h-4" />} onClick={() => setOpen(false)} accent="#fb923c">
                Admin
              </MenuLink>
            )}
          </div>

          {/* Sign out */}
          <div className="py-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => { setOpen(false); logout(); }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-left transition-colors"
              style={{ color: 'var(--color-text-3)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href, icon, children, onClick, accent,
}: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void; accent?: string }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
      style={{ color: accent ?? 'var(--color-text-2)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon}
      {children}
    </Link>
  );
}
