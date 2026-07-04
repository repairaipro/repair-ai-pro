"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Briefcase, AlertTriangle, Users, HardHat, ChevronRight, TrendingUp, DollarSign } from "lucide-react";

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const NAV = [
  { href: "/admin",             label: "Overview",    icon: LayoutDashboard },
  { href: "/admin/funnel",      label: "Funnel",      icon: TrendingUp },
  { href: "/admin/jobs",        label: "Jobs",        icon: Briefcase },
  { href: "/admin/disputes",    label: "Disputes",    icon: AlertTriangle },
  { href: "/admin/payouts",     label: "Payouts",     icon: DollarSign },
  { href: "/admin/contractors", label: "Contractors", icon: HardHat },
  { href: "/admin/users",       label: "Users",       icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user }  = useAuth();
  const router    = useRouter();
  const pathname  = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user === undefined) return; // still loading
    if (!user) { router.replace("/auth/signin"); return; }
    const isAdmin = ADMIN_UIDS.includes(user.uid) || user.email?.endsWith("@repair-ai.admin");
    if (!isAdmin) { router.replace("/"); return; }
    setReady(true);
  }, [user, router]);

  if (!ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Checking admin access…</p>
        </div>
      </div>
    );
  }

  const currentNav = NAV.find(n =>
    n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)
  );

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>

      {/* Admin header bar */}
      <div
        className="rounded-2xl mb-6 px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            🛡️
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Admin Panel</p>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{user?.email}</p>
          </div>
        </div>

        {/* Breadcrumb */}
        {currentNav && currentNav.href !== "/admin" && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-4)' }}>
            <Link href="/admin" className="transition-opacity hover:opacity-70" style={{ color: '#818cf8' }}>Overview</Link>
            <ChevronRight className="w-3 h-3" />
            <span style={{ color: 'var(--color-text-2)' }}>{currentNav.label}</span>
          </div>
        )}

        <Link href="/" className="btn btn-secondary btn-sm">
          ← Back to App
        </Link>
      </div>

      {/* Tab nav */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0"
              style={{
                background: active ? 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))' : 'transparent',
                color: active ? '#a5b4fc' : 'var(--color-text-4)',
                border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
