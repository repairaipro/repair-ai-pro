"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

type Provider = {
  id: string;
  providerType: "contractor" | "business";
  displayName: string;
  trade?: string | null;
  trades?: string[];
  availability?: string;
  reputationScore?: number;
  jobsCompleted?: number;
  distanceMiles?: number | null;
  score?: number;
  matchReason?: string;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  zipCode?: string | null;
  claimed?: boolean;
  businessType?: string;
};

type Props = {
  jobId: string;
};

function getAvailabilityLabel(value?: string) {
  if (value === "available") return "Available";
  if (value === "busy") return "Busy";
  if (value === "offline") return "Offline";
  return "Unknown";
}

function getProviderTypeLabel(value: string) {
  if (value === "business") return "Business";
  return "Contractor";
}

function getReasonLabel(value?: string) {
  switch (value) {
    case "zone":
      return "Service zone match";
    case "zip":
      return "ZIP match";
    case "city":
      return "City match";
    case "radius":
      return "Nearby";
    default:
      return "Recommended";
  }
}

export default function ProviderMatchPanel({ jobId }: Props) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  function toggleSelected(provider: Provider) {
    const key = `${provider.providerType}:${provider.id}`;

    setSelectedIds((prev) =>
      prev.includes(key)
        ? prev.filter((v) => v !== key)
        : [...prev, key]
    );
  }

  async function runMatch() {
    setLoading(true);
    setStatus("");
    setProviders([]);
    setSelectedIds([]);

    try {
      const res = await fetch("/api/match-providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to find providers");
      }

      setProviders(data.providers || []);
      setStatus(`Found ${data.providers?.length || 0} recommended providers.`);
    } catch (err: any) {
      setStatus(err?.message || "Failed to find providers.");
    } finally {
      setLoading(false);
    }
  }

  async function sendInvites() {
    if (!user) {
      setStatus("Please sign in.");
      return;
    }

    if (selectedIds.length === 0) {
      setStatus("Select at least one provider.");
      return;
    }

    setInviting(true);
    setStatus("");

    try {
      const selectedProviders = providers.filter((p) =>
        selectedIds.includes(`${p.providerType}:${p.id}`)
      );

      const res = await fetch("/api/invite-providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          customerId: user.uid,
          providerIds: selectedProviders.map((p) => ({
            id: p.id,
            providerType: p.providerType,
            displayName: p.displayName,
            score: p.score,
            distanceMiles: p.distanceMiles,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send invites");
      }

      setStatus(`Invited ${data.invitedCount} provider(s).`);
      setSelectedIds([]);
    } catch (err: any) {
      setStatus(err?.message || "Failed to send invites.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-indigo-300">
            Recommended Providers
          </div>
          <div className="text-xs text-gray-400">
            We’ll rank the best contractors and businesses. You choose who to invite.
          </div>
        </div>

        <button
          onClick={runMatch}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 rounded-md text-sm"
        >
          {loading ? "Finding..." : "Find Providers"}
        </button>
      </div>

      {status && <div className="text-xs text-gray-300">{status}</div>}

      {providers.length > 0 && (
        <>
          <div className="space-y-3">
            {providers.map((provider) => {
              const key = `${provider.providerType}:${provider.id}`;
              const checked = selectedIds.includes(key);

              return (
                <label
                  key={key}
                  className={`block rounded-lg border p-3 cursor-pointer transition ${
                    checked
                      ? "border-indigo-500 bg-indigo-950/30"
                      : "border-gray-800 bg-gray-950 hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelected(provider)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-white">
                          {provider.displayName}
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                          {getProviderTypeLabel(provider.providerType)}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300">
                          {getAvailabilityLabel(provider.availability)}
                        </span>

                        {provider.providerType === "business" && provider.claimed === false && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">
                            Unclaimed
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Trade: {provider.trade || "General"}</span>
                        <span>Score: {provider.score ?? 0}</span>
                        <span>Rep: {provider.reputationScore ?? 0}</span>
                        <span>Jobs: {provider.jobsCompleted ?? 0}</span>
                        <span>{getReasonLabel(provider.matchReason)}</span>
                        {typeof provider.distanceMiles === "number" && (
                          <span>{provider.distanceMiles.toFixed(1)} mi away</span>
                        )}
                      </div>

                      <div className="mt-2 text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        {provider.city && <span>{provider.city}</span>}
                        {provider.zipCode && <span>{provider.zipCode}</span>}
                        {provider.phone && <span>{provider.phone}</span>}
                        {provider.website && (
                          <span className="truncate max-w-[220px]">{provider.website}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-gray-400">
              Selected: {selectedIds.length}
            </div>

            <button
              onClick={sendInvites}
              disabled={inviting || selectedIds.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-4 py-2 rounded-md text-sm"
            >
              {inviting ? "Sending..." : "Invite Selected Providers"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}