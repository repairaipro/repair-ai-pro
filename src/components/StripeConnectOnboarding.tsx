"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, Clock, AlertTriangle, Banknote, Loader2, ExternalLink } from "lucide-react";

type OnboardingStatus = "not-connected" | "pending" | "connected" | "loading" | "error";

interface StripeConnectOnboardingProps {
  compact?: boolean;
}

function StatusBadge({ status }: { status: OnboardingStatus }) {
  const configs: Record<OnboardingStatus, { label: string; dotColor: string; bg: string; color: string }> = {
    connected:     { label: "Verified",       dotColor: "var(--color-success)", bg: "rgba(34,197,94,0.12)",  color: "var(--color-success)" },
    pending:       { label: "Pending",         dotColor: "var(--color-warning)", bg: "rgba(245,158,11,0.12)", color: "var(--color-warning)" },
    "not-connected":{ label: "Not connected",  dotColor: "var(--color-text-4)",  bg: "rgba(100,116,139,0.12)", color: "var(--color-text-4)" },
    loading:       { label: "Checking…",       dotColor: "var(--color-brand)",   bg: "rgba(99,102,241,0.12)", color: "var(--color-brand)" },
    error:         { label: "Error",           dotColor: "var(--color-error)",   bg: "rgba(239,68,68,0.12)",  color: "var(--color-error)" },
  };
  const c = configs[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: c.dotColor,
          animation: status === "pending" || status === "loading" ? "pulse 1.5s infinite" : undefined,
        }}
      />
      {c.label}
    </span>
  );
}

export function StripeConnectOnboarding({ compact = false }: StripeConnectOnboardingProps) {
  const { user } = useAuth();
  const [status,       setStatus]       = useState<OnboardingStatus>("loading");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [redirecting,  setRedirecting]  = useState(false);

  useEffect(() => {
    if (!user) return;
    checkStatus();
  }, [user]);

  async function checkStatus() {
    if (!user) return;
    try {
      setStatus("loading");
      const token = await user.getIdToken();
      const res   = await fetch("/api/stripe/connect/status", { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();

      if (data.verified) {
        setStatus("connected");
      } else if (data.onboardingComplete) {
        setStatus("pending");
        // Fetch requirements if pending
        const vRes  = await fetch("/api/stripe/connect/verify", { headers: { Authorization: `Bearer ${token}` } });
        const vData = await vRes.json();
        setRequirements(vData.requirements?.currently_due ?? []);
      } else {
        setStatus("not-connected");
      }
    } catch {
      setStatus("error");
    }
  }

  async function handleConnect() {
    if (!user) return;
    setRedirecting(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      if (data.onboarding_url) window.location.href = data.onboarding_url;
      else setStatus("error");
    } catch {
      setStatus("error");
    }
    setRedirecting(false);
  }

  /* ── Compact mode ── */
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {status !== "connected" && (
          <button
            onClick={handleConnect}
            disabled={redirecting || status === "loading"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "var(--color-brand)", color: "#fff", opacity: (redirecting || status === "loading") ? 0.6 : 1 }}
          >
            {redirecting ? <Loader2 size={11} className="animate-spin" /> : <Banknote size={11} />}
            {redirecting ? "Redirecting…" : "Connect Bank"}
          </button>
        )}
      </div>
    );
  }

  /* ── Full card mode ── */
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: "var(--color-bg-2)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <Banknote size={15} style={{ color: "var(--color-brand)" }} />
          <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
            Bank Account &amp; Payouts
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Body */}
      <div className="p-5 space-y-4" style={{ background: "var(--color-surface)" }}>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-brand)" }} />
            <span className="text-sm" style={{ color: "var(--color-text-3)" }}>Checking verification status…</span>
          </div>
        )}

        {/* Connected */}
        {status === "connected" && (
          <>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Bank account connected
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-4)", lineHeight: 1.6 }}>
                  Payouts are sent automatically when homeowners confirm job completion.
                  Funds arrive in 1–5 business days.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={redirecting}
              className="btn btn-sm btn-secondary flex items-center gap-1.5"
            >
              {redirecting
                ? <><Loader2 size={13} className="animate-spin" /> Redirecting…</>
                : <><ExternalLink size={13} /> Manage on Stripe</>}
            </button>
          </>
        )}

        {/* Pending */}
        {status === "pending" && (
          <>
            <div className="flex items-start gap-3">
              <Clock size={18} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Verification in progress
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-4)", lineHeight: 1.6 }}>
                  Stripe needs a bit more information. Takes ~2 minutes to complete.
                </p>
              </div>
            </div>
            {requirements.length > 0 && (
              <div
                className="rounded-xl px-4 py-3 space-y-1.5"
                style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-warning)" }}>
                  Still needed
                </p>
                {requirements.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--color-warning)" }} />
                    <span className="text-xs capitalize" style={{ color: "var(--color-text-3)" }}>
                      {r.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleConnect}
              disabled={redirecting}
              className="btn btn-primary btn-full"
              style={{ justifyContent: "center" }}
            >
              {redirecting
                ? <><Loader2 size={14} className="animate-spin" /> Redirecting…</>
                : <><ExternalLink size={14} /> Complete Verification on Stripe</>}
            </button>
          </>
        )}

        {/* Not connected */}
        {status === "not-connected" && (
          <>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Bank account required
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-4)", lineHeight: 1.6 }}>
                  Connect your bank to receive payouts. Takes ~2 minutes — your info is stored
                  securely by Stripe, never on our servers.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={redirecting}
              className="btn btn-primary btn-full"
              style={{ justifyContent: "center" }}
            >
              {redirecting
                ? <><Loader2 size={15} className="animate-spin" /> Opening Stripe…</>
                : <><Banknote size={15} /> Connect Bank Account</>}
            </button>
            <p className="text-center text-xs" style={{ color: "var(--color-text-4)" }}>
              Powered by Stripe — 256-bit encryption, bank-level security
            </p>
          </>
        )}

        {/* Error */}
        {status === "error" && (
          <>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} style={{ color: "var(--color-error)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Couldn't load status
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-4)" }}>
                  We couldn't verify your Stripe account. Please try again.
                </p>
              </div>
            </div>
            <button
              onClick={checkStatus}
              className="btn btn-secondary btn-sm"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default StripeConnectOnboarding;
