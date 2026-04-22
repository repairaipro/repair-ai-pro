"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type Stats = {
  totalJobs:        number;
  totalContractors: number;
  totalUsers:       number;
  openDisputes:     number;
  totalRevenue:     number;
  statusCounts:     Record<string, number>;
};

function StatCard({
  icon, label, value, sub, href, alert,
}: {
  icon: string; label: string; value: string | number;
  sub?: string; href?: string; alert?: boolean;
}) {
  const inner = (
    <div className={`bg-gray-900 border rounded-2xl p-5 transition ${
      alert ? "border-orange-700/60 hover:border-orange-500" : "border-gray-800 hover:border-gray-700"
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {alert && (
          <span className="text-[10px] bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full">Action needed</span>
        )}
      </div>
      <p className={`text-3xl font-bold ${alert ? "text-orange-400" : "text-white"}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function AdminOverviewPage() {
  const { user }               = useAuth();
  const [stats,  setStats]     = useState<Stats | null>(null);
  const [loading, setLoading]  = useState(true);
  const [error,   setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token: string) =>
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { setStats(d); setLoading(false); })
        .catch((e) => { setError(e.message); setLoading(false); })
    );
  }, [user]);

  const STATUS_ORDER = [
    "triaged", "accepted", "in_progress", "completed", "confirmed", "disputed", "cancelled", "verified",
  ];

  const STATUS_COLOR: Record<string, string> = {
    triaged:     "bg-yellow-500",
    accepted:    "bg-blue-500",
    in_progress: "bg-indigo-500",
    completed:   "bg-orange-500",
    confirmed:   "bg-green-500",
    verified:    "bg-emerald-500",
    disputed:    "bg-orange-600",
    cancelled:   "bg-gray-600",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time platform snapshot</p>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📋" label="Total Jobs"        value={stats.totalJobs}        href="/admin/jobs" />
            <StatCard icon="👷" label="Contractors"       value={stats.totalContractors} href="/admin/contractors" />
            <StatCard icon="👥" label="Users"             value={stats.totalUsers}       href="/admin/users" />
            <StatCard
              icon="⚠️"
              label="Open Disputes"
              value={stats.openDisputes}
              href="/admin/disputes"
              alert={stats.openDisputes > 0}
            />
          </div>

          {/* Revenue */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Revenue Processed</p>
            <p className="text-4xl font-bold text-green-400">
              ${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-600 mt-1">From confirmed + released payments</p>
          </div>

          {/* Job status breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-white mb-4">Job Status Breakdown</p>
            <div className="space-y-2.5">
              {STATUS_ORDER.map((status) => {
                const count = stats.statusCounts[status] ?? 0;
                const pct   = stats.totalJobs > 0 ? (count / stats.totalJobs) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-24 capitalize">{status.replace("_", " ")}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${STATUS_COLOR[status] ?? "bg-gray-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
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
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-300 hover:text-white transition"
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
