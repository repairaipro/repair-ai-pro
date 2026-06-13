'use client';

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  Brain, BarChart2, DollarSign, TrendingUp, RefreshCw,
  Home, Plus, AlertTriangle, Loader2, CalendarClock, ArrowRight,
} from "lucide-react";

/* ── Types ── */
type HomeHealthData = {
  score: number;
  totalSpent: number;
  last30DaysSpent: number;
  avgJobCost: number;
  totalJobs: number;
  completedJobs: number;
  tradeBreakdown: Record<string, number>;
  insights: string[];
};

type Suggestion = {
  id: string;
  title: string;
  why: string;
  trade: string;
  emoji: string;
  priority: "high" | "medium" | "low";
  prefill: string;
  seasonal: boolean;
};

type SuggestionsData = {
  season: string;
  month: string;
  suggestions: Suggestion[];
  isNewHomeowner: boolean;
};

/* ── Score helpers ── */
function scoreStyle(score: number): { color: string; label: string } {
  if (score >= 80) return { color: "var(--color-success)", label: "Excellent" };
  if (score >= 60) return { color: "#fbbf24",              label: "Good" };
  if (score >= 40) return { color: "#fb923c",              label: "Fair" };
  return                  { color: "var(--color-error)",   label: "Needs Attention" };
}

const TRADE_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#fb923c", "#60a5fa"];

/* ── Skeleton ── */
function Skeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse rounded-xl"
      style={{ background: "var(--color-surface-2)", ...style }}
    />
  );
}

/* ── Score Ring ── */
function ScoreRing({ score, loading }: { score: number; loading: boolean }) {
  const { color, label } = scoreStyle(score);
  const r    = 64;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div
      className="rounded-2xl p-8 flex flex-col items-center text-center"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Subtitle */}
      <div className="flex items-center gap-2 mb-6">
        <Home size={14} style={{ color: "var(--color-brand)" }} />
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--color-text-4)" }}
        >
          Home Health Score
        </span>
      </div>

      {/* Ring */}
      {loading ? (
        <div
          className="w-40 h-40 rounded-full animate-pulse"
          style={{ background: "var(--color-surface-2)" }}
        />
      ) : (
        <div className="relative w-40 h-40">
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Track */}
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="var(--color-surface-2)"
              strokeWidth="10"
            />
            {/* Fill */}
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{
                transition: "stroke-dashoffset 1.2s ease, stroke 0.5s ease",
                filter: `drop-shadow(0 0 8px ${color}70)`,
              }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-black"
              style={{ fontSize: 42, lineHeight: 1, color }}
            >
              {score}
            </span>
            <span
              className="text-xs font-semibold mt-0.5"
              style={{ color: "var(--color-text-4)" }}
            >
              / 100
            </span>
          </div>
        </div>
      )}

      {/* Grade + subtitle */}
      <div className="mt-5">
        {loading ? (
          <div className="space-y-2 flex flex-col items-center">
            <Skeleton style={{ width: 100, height: 20 }} />
            <Skeleton style={{ width: 240, height: 14 }} />
          </div>
        ) : (
          <>
            <p
              className="text-2xl font-bold"
              style={{ color }}
            >
              {label}
            </p>
            <p
              className="text-sm mt-2 max-w-xs mx-auto leading-relaxed"
              style={{ color: "var(--color-text-3)" }}
            >
              Your home&apos;s health based on repair history and maintenance
              activity
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── AI Insights ── */
function InsightsSection({
  insights,
  loading,
}: {
  insights: string[];
  loading: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={16} style={{ color: "var(--color-brand)" }} />
        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: "var(--color-text)" }}
        >
          AI Insights
        </h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[80, 100, 70].map((w, i) => (
            <Skeleton key={i} style={{ width: `${w}%`, height: 52 }} />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-4)" }}>
          No insights yet — post a job to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl p-4"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                style={{ background: TRADE_COLORS[i % TRADE_COLORS.length] }}
              />
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-2)" }}
              >
                {insight}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Trade Breakdown ── */
function TradeBreakdownSection({
  breakdown,
  loading,
}: {
  breakdown: Record<string, number>;
  loading: boolean;
}) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const maxCount = entries.length > 0 ? entries[0][1] : 1;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} style={{ color: "var(--color-brand)" }} />
        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: "var(--color-text)" }}
        >
          Issues by Category
        </h2>
      </div>

      <div
        className="rounded-2xl p-5"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {loading ? (
          <div className="space-y-4">
            {[60, 90, 45, 75].map((w, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton style={{ width: 80, height: 12 }} />
                <Skeleton style={{ width: `${w}%`, height: 8 }} />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p
            className="text-sm text-center py-4"
            style={{ color: "var(--color-text-4)" }}
          >
            No jobs posted yet.
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map(([trade, count], i) => {
              const color = TRADE_COLORS[i % TRADE_COLORS.length];
              const pct   = Math.round((count / maxCount) * 100);
              return (
                <div key={trade}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--color-text-2)" }}
                    >
                      {trade}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color }}
                    >
                      {count}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--color-surface-2)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                        transition: "width 0.8s ease",
                        boxShadow: `0 0 6px ${color}60`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Spending Section ── */
function SpendingSection({
  data,
  loading,
}: {
  data: HomeHealthData | null;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Total Invested",
      value: data ? `$${data.totalSpent.toLocaleString()}` : "—",
      icon: <DollarSign size={16} />,
      color: "var(--color-success)",
    },
    {
      label: "Last 30 Days",
      value: data ? `$${data.last30DaysSpent.toLocaleString()}` : "—",
      icon: <TrendingUp size={16} />,
      color: "#fbbf24",
    },
    {
      label: "Avg Job Cost",
      value: data?.avgJobCost ? `$${Math.round(data.avgJobCost).toLocaleString()}` : "—",
      icon: <BarChart2 size={16} />,
      color: "#60a5fa",
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-3 gap-3">
        {cards.map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex flex-col items-center text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            {loading ? (
              <>
                <Skeleton style={{ width: 24, height: 24, marginBottom: 8 }} />
                <Skeleton style={{ width: 60, height: 20, marginBottom: 4 }} />
                <Skeleton style={{ width: 50, height: 10 }} />
              </>
            ) : (
              <>
                <div className="mb-2" style={{ color }}>
                  {icon}
                </div>
                <p
                  className="text-xl font-bold"
                  style={{ color: "var(--color-text)" }}
                >
                  {value}
                </p>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: "var(--color-text-4)" }}
                >
                  {label}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Seasonal Maintenance (the proactive retention engine) ── */
const PRIORITY_STYLE: Record<string, { color: string; label: string }> = {
  high:   { color: "#f87171", label: "Recommended now" },
  medium: { color: "#fbbf24", label: "Worth scheduling" },
  low:    { color: "#60a5fa", label: "When convenient" },
};

function SeasonalMaintenance({
  data,
  loading,
}: {
  data: SuggestionsData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock size={16} style={{ color: "var(--color-brand)" }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text)" }}>
            Seasonal Maintenance
          </h2>
        </div>
        <div className="space-y-3">
          {[72, 90].map((w, i) => <Skeleton key={i} style={{ width: `${w}%`, height: 76 }} />)}
        </div>
      </section>
    );
  }

  if (!data || data.suggestions.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock size={16} style={{ color: "var(--color-brand)" }} />
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text)" }}>
          Seasonal Maintenance
        </h2>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--color-text-4)" }}>
        It&apos;s {data.month} — here&apos;s what keeps your home ahead of the next breakdown.
      </p>

      <div className="space-y-3">
        {data.suggestions.map((s) => {
          const p = PRIORITY_STYLE[s.priority] ?? PRIORITY_STYLE.low;
          return (
            <Link
              key={s.id}
              href={`/jobs/new?desc=${encodeURIComponent(s.prefill)}`}
              className="flex items-start gap-3 rounded-2xl p-4 transition-all group"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: "var(--color-surface-2)" }}
              >
                {s.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {s.title}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${p.color}1a`, color: p.color }}
                  >
                    {p.label}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text-4)" }}>
                  {s.why}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium mt-2 transition-transform group-hover:translate-x-0.5"
                  style={{ color: "var(--color-brand)" }}
                >
                  Get a quote for this <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ── Main Page ── */
export default function HomeHealthPage() {
  const { user } = useAuth();
  const [data,    setData]    = useState<HomeHealthData | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const [healthRes, sugRes] = await Promise.all([
        fetch("/api/homeowner/home-health", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/homeowner/maintenance-suggestions", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!healthRes.ok) throw new Error(`Request failed: ${healthRes.status}`);
      const json = await healthRes.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      if (sugRes.ok) {
        const sug = await sugRes.json();
        if (sug.success) setSuggestions(sug);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load Home Health data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Not signed in ── */
  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            maxWidth: 320,
          }}
        >
          <p
            className="text-sm mb-4"
            style={{ color: "var(--color-text-3)" }}
          >
            Sign in to view your Home Health Score.
          </p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error && !loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--color-bg)" }}
      >
        <div
          className="rounded-2xl p-8 text-center max-w-sm w-full"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(239,68,68,0.1)" }}
          >
            <AlertTriangle size={22} style={{ color: "var(--color-error)" }} />
          </div>
          <p
            className="font-semibold mb-1"
            style={{ color: "var(--color-text)" }}
          >
            Something went wrong
          </p>
          <p
            className="text-sm mb-6 leading-relaxed"
            style={{ color: "var(--color-text-4)" }}
          >
            {error}
          </p>
          <button
            onClick={fetchData}
            className="btn btn-primary btn-full"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const score       = data?.score ?? 85;
  const insights    = data?.insights ?? [];
  const breakdown   = data?.tradeBreakdown ?? {};

  return (
    <div
      className="min-h-screen animate-fade-in"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--color-text)", letterSpacing: "-0.03em" }}
            >
              Home Health
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--color-text-4)" }}
            >
              Full report &amp; spending breakdown
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            aria-label="Refresh"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Refresh
          </button>
        </div>

        {/* ── Hero ring ── */}
        <ScoreRing score={score} loading={loading} />

        {/* ── Seasonal maintenance (proactive, tappable) ── */}
        <SeasonalMaintenance data={suggestions} loading={loading} />

        {/* ── Spending cards ── */}
        <SpendingSection data={data} loading={loading} />

        {/* ── AI Insights ── */}
        <InsightsSection insights={insights} loading={loading} />

        {/* ── Trade breakdown ── */}
        <TradeBreakdownSection breakdown={breakdown} loading={loading} />

        {/* ── Quick action ── */}
        <Link href="/jobs/new" className="btn btn-primary btn-full">
          <Plus size={16} /> Post a New Job
        </Link>

      </div>
    </div>
  );
}
