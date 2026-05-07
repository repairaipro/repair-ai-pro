"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { Briefcase, HardHat, Users, AlertTriangle, DollarSign } from "lucide-react";

type Stats = {
  totalJobs:        number;
  totalContractors: number;
  totalUsers:       number;
  openDisputes:     number;
  totalRevenue:     number;
  statusCounts:     Record<string, number>;
};

const STATUS_ORDER = ["triaged","accepted","in_progress","completed","confirmed","disputed","cancelled","verified"];

const STATUS_STYLES: Record<string, { color: string; bar: string; label: string }> = {
  triaged:     { color: '#fbbf24', bar: '#f59e0b', label: 'Triaged' },
  accepted:    { color: '#60a5fa', bar: '#3b82f6', label: 'Accepted' },
  in_progress: { color: '#818cf8', bar: '#6366f1', label: 'In Progress' },
  completed:   { color: '#fb923c', bar: '#f97316', label: 'Completed' },
  confirmed:   { color: '#34d399', bar: '#10b981', label: 'Confirmed' },
  verified:    { color: '#34d399', bar: '#10b981', label: 'Verified' },
  disputed:    { color: '#fb923c', bar: '#f97316', label: 'Disputed' },
  cancelled:   { color: '#6b7280', bar: '#4b5563', label: 'Cancelled' },
};

export default function AdminOverviewPage() {
  const { user }             = useAuth();
  const [stats,  setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token: string) =>
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { setStats(d); setLoading(false); })
        .catch((e) => { setError(e.message); setLoading(false); })
    );
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Overview</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>Real-time platform snapshot</p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton rounded-2xl h-32" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: Briefcase,    label: "Total Jobs",    value: stats.totalJobs,        color: '#818cf8', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)',  href: "/admin/jobs" },
              { icon: HardHat,      label: "Contractors",   value: stats.totalContractors, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  href: "/admin/contractors" },
              { icon: Users,        label: "Users",         value: stats.totalUsers,       color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', href: "/admin/users" },
              { icon: AlertTriangle,label: "Open Disputes", value: stats.openDisputes,     color: stats.openDisputes > 0 ? '#fb923c' : '#34d399', bg: stats.openDisputes > 0 ? 'rgba(249,115,22,0.1)' : 'rgba(16,185,129,0.1)', border: stats.openDisputes > 0 ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)', href: "/admin/disputes" },
              { icon: DollarSign,   label: "Revenue",       value: `$${stats.totalRevenue.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', href: undefined },
            ].map(({ icon: Icon, label, value, color, bg, border, href }) => {
              const inner = (
                <div
                  className="card p-5 transition-all duration-200 h-full"
                  style={{ background: bg, borderColor: border }}
                  onMouseEnter={e => href && ((e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => href && ((e.currentTarget as HTMLElement).style.transform = 'translateY(0)')}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, border: `1px solid ${border}` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>{label}</p>
                </div>
              );
              return href
                ? <Link key={label} href={href}>{inner}</Link>
                : <div key={label}>{inner}</div>;
            })}
          </div>

          {/* Job status breakdown */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--color-text)' }}>Job Status Breakdown</h2>
            <div className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = stats.statusCounts[status] ?? 0;
                const pct   = stats.totalJobs > 0 ? (count / stats.totalJobs) * 100 : 0;
                const s = STATUS_STYLES[status];
                return (
                  <div key={status} className="flex items-center gap-4">
                    <span className="text-xs w-24 capitalize flex-shrink-0" style={{ color: 'var(--color-text-4)' }}>
                      {s?.label ?? status.replace("_"," ")}
                    </span>
                    <div className="flex-1 rounded-full h-1.5" style={{ background: 'var(--color-surface-2)' }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: s?.bar ?? '#6b7280' }}
                      />
                    </div>
                    <span className="text-xs w-6 text-right flex-shrink-0" style={{ color: 'var(--color-text-4)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/admin/disputes",    label: "Resolve Disputes",   icon: "⚠️" },
              { href: "/admin/jobs",        label: "Manage Jobs",        icon: "📋" },
              { href: "/admin/contractors", label: "Verify Contractors", icon: "👷" },
              { href: "/admin/users",       label: "View Users",         icon: "👥" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-3)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)';
                }}
              >
                <span>{item.icon}</span>{item.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
