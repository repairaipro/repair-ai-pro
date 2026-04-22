"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

type OnboardingStatus = "not-connected" | "pending" | "connected" | "loading" | "error";

interface StripeConnectOnboardingProps {
  compact?: boolean;
}

/**
 * StripeConnectOnboarding Component
 *
 * Shows contractor's Stripe Connect onboarding status and provides:
 * - Status badge (Not Connected → Pending Verification → Connected)
 * - "Connect Bank Account" button to start onboarding
 * - Verification progress and requirements
 *
 * Usage:
 *   <StripeConnectOnboarding />
 *   <StripeConnectOnboarding compact={true} />
 */
export function StripeConnectOnboarding({
  compact = false,
}: StripeConnectOnboardingProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>("loading");
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<any>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch current Stripe Connect status on mount and when user changes
  useEffect(() => {
    if (!user) return;

    const checkStatus = async () => {
      try {
        setStatus("loading");
        const idToken = await user.getIdToken();

        const res = await fetch("/api/stripe/connect/status", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const data = await res.json();

        if (data.verified) {
          setStatus("connected");
        } else if (data.onboardingComplete) {
          setStatus("pending");
        } else {
          setStatus("not-connected");
        }

        // If pending, fetch full verification details to show requirements
        if (!data.verified) {
          const verifyRes = await fetch("/api/stripe/connect/verify", {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          const verifyData = await verifyRes.json();
          setRequirements(verifyData.requirements);
        }
      } catch (err) {
        console.error("Failed to check Stripe Connect status:", err);
        setStatus("error");
      }
    };

    checkStatus();
  }, [user]);

  const handleConnectClick = async () => {
    if (!user) return;

    try {
      setIsRedirecting(true);
      const idToken = await user.getIdToken();

      const res = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      const data = await res.json();

      if (data.onboarding_url) {
        setOnboardingUrl(data.onboarding_url);
        // Redirect to Stripe's hosted onboarding form
        window.location.href = data.onboarding_url;
      } else {
        console.error("Failed to get onboarding URL:", data);
        setStatus("error");
      }
    } catch (err) {
      console.error("Failed to start onboarding:", err);
      setStatus("error");
    } finally {
      setIsRedirecting(false);
    }
  };

  // Compact mode: just show status badge + button
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {status !== "connected" && (
          <button
            onClick={handleConnectClick}
            disabled={isRedirecting || status === "loading"}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRedirecting ? "Redirecting..." : "Connect Bank"}
          </button>
        )}
      </div>
    );
  }

  // Full mode: detailed card with requirements
  return (
    <div className="border rounded-lg p-6 bg-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Bank Account Verification</h3>
          <p className="text-gray-600 text-sm mb-4">
            {status === "connected"
              ? "Your bank account is connected and verified. You'll receive payouts after jobs are confirmed."
              : status === "pending"
              ? "Verification in progress. Complete the KYC requirements to start accepting jobs."
              : status === "loading"
              ? "Loading verification status..."
              : status === "error"
              ? "Failed to load verification status. Please try again."
              : "Connect your bank account to accept jobs and receive payouts."}
          </p>

          {/* Show requirements if pending */}
          {status === "pending" && requirements?.currently_due?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-yellow-700 mb-2">
                Complete these requirements:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {requirements.currently_due.map((req: string) => (
                  <li key={req}>{req.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <StatusBadge status={status} />
      </div>

      {/* Action button */}
      <button
        onClick={handleConnectClick}
        disabled={
          isRedirecting ||
          status === "loading" ||
          status === "connected" ||
          status === "error"
        }
        className={`mt-4 px-4 py-2 rounded font-medium transition ${
          status === "connected"
            ? "bg-green-100 text-green-700 cursor-default"
            : isRedirecting || status === "loading"
            ? "bg-gray-300 text-gray-500 cursor-wait"
            : status === "error"
            ? "bg-red-100 text-red-700 hover:bg-red-200"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {status === "connected"
          ? "✓ Connected"
          : isRedirecting
          ? "Redirecting to Stripe..."
          : status === "loading"
          ? "Loading..."
          : status === "error"
          ? "Try Again"
          : "Connect Bank Account"}
      </button>

      {/* Info text */}
      <p className="text-xs text-gray-500 mt-4">
        We use Stripe to securely handle payments and payouts. Your banking information is
        never stored on our servers.
      </p>
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: OnboardingStatus }) {
  const badges = {
    "not-connected": {
      bg: "bg-gray-100",
      text: "text-gray-700",
      label: "Not Connected",
    },
    pending: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      label: "Pending",
    },
    connected: {
      bg: "bg-green-100",
      text: "text-green-700",
      label: "Connected",
    },
    loading: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      label: "Loading...",
    },
    error: {
      bg: "bg-red-100",
      text: "text-red-700",
      label: "Error",
    },
  };

  const badge = badges[status];

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
      <span
        className={`w-2 h-2 rounded-full ${
          status === "connected"
            ? "bg-green-500"
            : status === "pending"
            ? "bg-yellow-500 animate-pulse"
            : status === "loading"
            ? "bg-blue-500 animate-pulse"
            : status === "error"
            ? "bg-red-500"
            : "bg-gray-400"
        }`}
      />
      {badge.label}
    </span>
  );
}
