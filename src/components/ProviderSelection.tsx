"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  serverTimestamp,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import {
  scoreContractorMatch,
  getTrustScore,
  getTrustTier,
} from "@/lib/matching";
import type { ContractorLike } from "@/lib/matching";
import { logJobEvent } from "@/lib/logEvent";

type Props = {
  jobId: string;
  trade?: string;
  location?: {
    city?: string;
  };
};

type ProviderCard = {
  id: string;
  name?: string;
  trade?: string;
  city?: string;
  rating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
  invitationAcceptCount?: number;
  invitationDeclineCount?: number;
  boostActive?: boolean;
  boostLevel?: number;
  score: number;
  trustScore: number;
  trustTierLabel: string;
  trustTierKey: string;
};

export default function ProviderSelection({
  jobId,
  trade,
  location,
}: Props) {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function loadProviders() {
      setLoading(true);

      try {
        const snap = await getDocs(collection(db, "contractors"));

        const list = snap.docs.flatMap((contractorDoc) => {
          const data = contractorDoc.data() as Omit<ProviderCard, "id" | "score" | "trustScore" | "trustTierLabel" | "trustTierKey">;

          const contractor: ContractorLike = {
            id: contractorDoc.id,
            trade: data.trade,
            city: data.city,
            rating: data.rating,
            reviewCount: data.reviewCount,
            jobsCompleted: data.jobsCompleted,
            invitationAcceptCount: data.invitationAcceptCount,
            invitationDeclineCount: data.invitationDeclineCount,
            boostActive: data.boostActive,
            boostLevel: data.boostLevel,
          };

          const matchResult = scoreContractorMatch(contractor, {
            trade,
            location: { city: location?.city },
          });

          // Exclude contractors that don't match at all
          if (!matchResult.matched && (trade || location?.city)) return [];

          const trustScore = getTrustScore(contractor);
          const tier = getTrustTier(trustScore);

          return [{
            id: contractorDoc.id,
            ...data,
            score: matchResult.score,
            trustScore,
            trustTierLabel: tier.label,
            trustTierKey: tier.key,
          }];
        });

        list.sort((a, b) => b.score - a.score);
        setProviders(list);
      } catch (err) {
        console.error(err);
        setStatus("Failed to load providers.");
      } finally {
        setLoading(false);
      }
    }

    loadProviders();
  }, [trade, location]);

  async function invite(providerId: string) {
    if (!user) return;

    setInviting(providerId);
    setStatus("");

    try {
      const invitationId = `contractor_${providerId}`;
      const batch = writeBatch(db);

      const invitationRef = doc(db, "jobs", jobId, "invitations", invitationId);
      batch.set(
        invitationRef,
        {
          contractorId: providerId,
          status: "pending",
          invitedAt: serverTimestamp(),
          source: "manual_selection",
        },
        { merge: true }
      );

      const inboxRef = doc(
        db,
        "contractors",
        providerId,
        "jobInbox",
        `${jobId}_${providerId}`
      );

      batch.set(
        inboxRef,
        {
          jobId,
          invitationStatus: "pending",
          invitedAt: serverTimestamp(),
          source: "manual_selection",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();

      await logJobEvent(jobId, user.uid, "providers_invited", {
        invitedCount: 1,
        providerId,
        source: "manual_selection",
      });

      setStatus("Provider invited.");
    } catch (err: any) {
      console.error(err);
      setStatus(err?.message || "Failed to invite provider.");
    } finally {
      setInviting(null);
    }
  }

  function trustBadgeClass(key: string) {
    if (key === "high") {
      return "border-emerald-700 bg-emerald-900/30 text-emerald-200";
    }
    if (key === "medium") {
      return "border-blue-700 bg-blue-900/30 text-blue-200";
    }
    if (key === "developing") {
      return "border-amber-700 bg-amber-900/30 text-amber-200";
    }
    return "border-red-700 bg-red-900/30 text-red-200";
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
      <div>
        <div className="text-sm font-semibold text-indigo-300">
          Recommended Providers
        </div>
        <div className="text-xs text-gray-400">
          Ranked by match quality, reliability, and history
        </div>
      </div>

      {status && <div className="text-xs text-gray-300">{status}</div>}

      {loading ? (
        <div className="text-sm text-gray-400">Loading providers...</div>
      ) : providers.length === 0 ? (
        <div className="text-sm text-gray-500">No contractors found.</div>
      ) : (
        <div className="space-y-3">
          {providers.slice(0, 10).map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-gray-800 bg-gray-950 p-3"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {p.name || "Contractor"}
                  </div>

                  <div className="text-xs text-gray-400">
                    {p.trade || "General"}
                  </div>

                  <div className="text-xs text-gray-500">
                    {p.city || "Unknown location"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-indigo-300 font-semibold">
                    Match {p.score}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Trust {p.trustScore}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <div
                  className={`text-[11px] px-2 py-1 rounded-full border ${trustBadgeClass(
                    p.trustTierKey
                  )}`}
                >
                  {p.trustTierKey === "high"
                    ? "🟢"
                    : p.trustTierKey === "medium"
                    ? "🔵"
                    : p.trustTierKey === "developing"
                    ? "🟡"
                    : "🔴"}{" "}
                  {p.trustTierLabel}
                </div>

                <div className="text-[11px] px-2 py-1 rounded-full border border-amber-700 bg-amber-900/30 text-amber-200">
                  ⭐ {(p.rating || 0).toFixed(1)} ({p.reviewCount || 0})
                </div>

                <div className="text-[11px] px-2 py-1 rounded-full border border-indigo-700 bg-indigo-900/30 text-indigo-200">
                  ✅ {p.jobsCompleted || 0} completed
                </div>

                {p.boostActive && (
                  <div className="text-[11px] px-2 py-1 rounded-full border border-fuchsia-700 bg-fuchsia-900/30 text-fuchsia-200">
                    ⚡ Featured
                  </div>
                )}
              </div>

              <button
                onClick={() => invite(p.id)}
                disabled={inviting === p.id}
                className="mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-3 py-2 rounded-md text-xs"
              >
                {inviting === p.id ? "Inviting..." : "Invite"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}