"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, Clock, XCircle, DollarSign } from "lucide-react";

type PayoutRow = {
  jobId: string;
  description: string;
  contractorId: string | null;
  contractorName: string;
  totalAmount: number;
  payoutAmount: number;
  payoutStatus: "transferred" | "pending" | "failed" | "unknown";
  releasedAt: string | null;
};

type PayoutsData = {
  totalReleased: number;
  totalPaidOut: number;
  platformRevenue: number;
  transferredCount: number;
  pendingCount: number;
  failedCount: number;
  rows: PayoutRow[];
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  transferred: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#34d399', bg: 'rgba(16,185,129,0.1)', label: 'Paid' },
  pending:     { icon: <Clock className="w-3.5 h-3.5" />,        color: '#fb923c', bg: 'rgba(249,115,22,0.1)', label: 'Needs attention' },
  failed:      { icon: <XCircle className="w-3.5 h-3.5" />,      color: '#f87171', bg: 'rgba(239,68,68,0.1)',  label: 'Failed' },
  unknown:     { icon: <Clock className="w-3.5 h-3.5" />,        color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Unknown' },
};

export default function AdminPayoutsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "failed">("all");

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token: string) =>
      fetch("/api/admin/payouts", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) { setError(d.error); } else { setData(d); }
          setLoading(false);
        })
        .catch((e) => { setError(e.message); setLoading(false); })
    );
  }, [user]);

  const filteredRows = data?.rows.filter((r) => filter === "all" || r.payoutStatus === filter) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Payouts</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
          Contractor transfers and platform fee revenue from released payments
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton rounded-2xl h-28" />)}
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: DollarSign, label: "Platform Revenue", value: `$${data.platformRevenue.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
              { icon: DollarSign, label: "Total Paid Out",    value: `$${data.totalPaidOut.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: '#818cf8', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)' },
              { icon: Clock,      label: "Needs Attention",   value: data.pendingCount, color: data.pendingCount > 0 ? '#fb923c' : '#34d399', bg: data.pendingCount > 0 ? 'rgba(249,115,22,0.1)' : 'rgba(16,185,129,0.1)', border: data.pendingCount > 0 ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)' },
              { icon: XCircle,    label: "Failed Transfers",  value: data.failedCount, color: data.failedCount > 0 ? '#f87171' : '#34d399', bg: data.failedCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: data.failedCount > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' },
            ].map(({ icon: Icon, label, value, color, bg, border }) => (
              <div key={label} className="card p-5" style={{ background: bg, borderColor: border }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, border: `1px solid ${border}` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>{label}</p>
              </div>
            ))}
          </div>

          {(data.pendingCount > 0 || data.failedCount > 0) && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c' }}>
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {data.pendingCount > 0 && `${data.pendingCount} payout${data.pendingCount === 1 ? '' : 's'} held on the platform account`}
                {data.pendingCount > 0 && data.failedCount > 0 && ' and '}
                {data.failedCount > 0 && `${data.failedCount} transfer${data.failedCount === 1 ? '' : 's'} failed`}
                {' — contractors haven\'t been paid for these jobs yet. Usually caused by an unverified Stripe Connect account.'}
              </span>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {(["all", "pending", "failed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: filter === f ? 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))' : 'transparent',
                  color: filter === f ? '#a5b4fc' : 'var(--color-text-4)',
                }}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {["Job", "Contractor", "Total", "Payout", "Status", "Released"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--color-text-4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center px-4 py-8 text-sm" style={{ color: 'var(--color-text-4)' }}>No payouts found</td></tr>
                ) : filteredRows.map((row) => {
                  const s = STATUS_CONFIG[row.payoutStatus] ?? STATUS_CONFIG.unknown;
                  return (
                    <tr key={row.jobId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/jobs?jobId=${row.jobId}`} className="text-xs hover:underline" style={{ color: '#818cf8' }}>
                          {row.description || row.jobId.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-3)' }}>{row.contractorName}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-3)' }}>${row.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>${row.payoutAmount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: s.bg, color: s.color }}>
                          {s.icon}{s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-4)' }}>
                        {row.releasedAt ? new Date(row.releasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
