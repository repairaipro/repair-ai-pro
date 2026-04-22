"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "@/lib/auth";

/* ── Stripe appearance ───────────────────────────────────────────────────── */

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary:    "#6366f1",
    colorBackground: "#111827",
    colorText:       "#f9fafb",
    colorDanger:     "#ef4444",
    borderRadius:    "8px",
    fontFamily:      "system-ui, sans-serif",
  },
};

/* ── Inner form (must be inside <Elements>) ──────────────────────────────── */

function CheckoutForm({
  amountUsd,
  onSuccess,
}: {
  amountUsd: number;
  onSuccess: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || paying) return;

    setPaying(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? "Card validation failed");
      setPaying(false);
      return;
    }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmErr) {
      setError(confirmErr.message ?? "Payment failed");
      setPaying(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm"
      >
        {paying ? "Processing…" : `Pay $${amountUsd.toFixed(2)} — Secure Job`}
      </button>

      <p className="text-xs text-gray-600 text-center">
        Funds are held securely until you confirm the work is complete
      </p>
    </form>
  );
}

/* ── PaymentCard — shown in the chat sidebar ─────────────────────────────── */

type PaymentStatus = "pending" | "held" | "released" | "refunded" | "failed" | null;

type Props = {
  jobId:         string;
  amountUsd?:    number;
  paymentStatus: PaymentStatus;
  onPaymentHeld: () => void;
};

export default function PaymentCard({
  jobId,
  amountUsd,
  paymentStatus,
  onPaymentHeld,
}: Props) {
  const { user }         = useAuth();
  const [loading,  setLoading]  = useState(false);
  const [secret,   setSecret]   = useState<string | null>(null);
  const [amount,   setAmount]   = useState(amountUsd ?? 0);
  const [paid,     setPaid]     = useState(paymentStatus === "held" || paymentStatus === "released");
  const [error,    setError]    = useState<string | null>(null);

  /* Already paid — show badge */
  if (paid || paymentStatus === "held" || paymentStatus === "released") {
    return (
      <div className="rounded-2xl border border-green-700/40 bg-green-950/30 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-green-400">Payment Secured</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Funds are held safely and will be released when you confirm the work.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* Create intent and show the checkout form */
  async function startPayment() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res   = await fetch("/api/stripe/create-intent", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start payment");
      setSecret(data.clientSecret);
      setAmount(data.amountUsd);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess() {
    setPaid(true);
    onPaymentHeld();
  }

  return (
    <div className="rounded-2xl border border-indigo-700/40 bg-indigo-950/20 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">💳</span>
        <div>
          <p className="text-sm font-semibold text-white">Secure Your Job</p>
          <p className="text-xs text-gray-500">
            Pay the estimated cost to lock in your contractor
          </p>
        </div>
      </div>

      {/* Amount */}
      {amount > 0 && !secret && (
        <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">Estimated Cost</span>
          <span className="text-lg font-bold text-white">${amount.toFixed(2)}</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!secret ? (
        <button
          onClick={startPayment}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm"
        >
          {loading ? "Loading…" : "Pay & Secure Job"}
        </button>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: secret, appearance: APPEARANCE }}
        >
          <CheckoutForm amountUsd={amount} onSuccess={handleSuccess} />
        </Elements>
      )}

      <div className="flex items-center gap-1.5 justify-center">
        <span className="text-xs text-gray-600">Powered by</span>
        <span className="text-xs text-gray-500 font-semibold">Stripe</span>
        <span className="text-[10px] text-gray-700">· 256-bit SSL</span>
      </div>
    </div>
  );
}
