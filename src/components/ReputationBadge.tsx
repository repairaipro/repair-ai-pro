"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/db";
import { getTrustScore, getTrustTier } from "@/lib/matching";

type Props = {
  contractorId?: string | null;
};

type ContractorProfile = {
  rating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
  trade?: string;
  invitationAcceptCount?: number;
  invitationDeclineCount?: number;
};

export default function ReputationBadge({ contractorId }: Props) {
  const [profile, setProfile] = useState<ContractorProfile | null>(null);

  useEffect(() => {
    if (!contractorId) return;

    const ref = doc(db, "contractors", contractorId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setProfile(null);
        return;
      }

      setProfile(snap.data() as ContractorProfile);
    });

    return () => unsub();
  }, [contractorId]);

  if (!contractorId) return null;

  if (!profile) {
    return (
      <div className="text-[11px] px-2 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-300">
        Contractor
      </div>
    );
  }

  const rating = profile.rating ?? 0;
  const reviewCount = profile.reviewCount ?? 0;
  const jobsCompleted = profile.jobsCompleted ?? 0;

  const trustScore = getTrustScore({
    id: contractorId,
    rating: profile.rating,
    reviewCount: profile.reviewCount,
    jobsCompleted: profile.jobsCompleted,
    invitationAcceptCount: profile.invitationAcceptCount,
    invitationDeclineCount: profile.invitationDeclineCount,
  });

  const tier = getTrustTier(trustScore);

  const trustClass =
    tier.key === "high"
      ? "border-emerald-700 bg-emerald-900/30 text-emerald-200"
      : tier.key === "medium"
      ? "border-blue-700 bg-blue-900/30 text-blue-200"
      : tier.key === "developing"
      ? "border-amber-700 bg-amber-900/30 text-amber-200"
      : "border-red-700 bg-red-900/30 text-red-200";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div
        className={`text-[11px] px-2 py-1 rounded-full border ${trustClass}`}
      >
        {tier.key === "high"
          ? "🟢"
          : tier.key === "medium"
          ? "🔵"
          : tier.key === "developing"
          ? "🟡"
          : "🔴"}{" "}
        {tier.label}
      </div>

      <div className="text-[11px] px-2 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-200">
        Trust {trustScore}
      </div>

      <div className="text-[11px] px-2 py-1 rounded-full border border-amber-700 bg-amber-900/30 text-amber-200">
        ⭐ {rating.toFixed(1)} ({reviewCount})
      </div>

      <div className="text-[11px] px-2 py-1 rounded-full border border-indigo-700 bg-indigo-900/30 text-indigo-200">
        ✅ {jobsCompleted} completed
      </div>

      {profile.trade && (
        <div className="text-[11px] px-2 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-300">
          {profile.trade}
        </div>
      )}
    </div>
  );
}