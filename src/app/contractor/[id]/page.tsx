'use client';

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";

type Review = {
  id: string;
  reviewerId?: string;
  rating: number;
  text: string;
  createdAt?: any;
};

type ContractorProfile = {
  name?: string;
  trade?: string;
  experience?: number;
  bio?: string;
  city?: string;
  photoUrl?: string;
  portfolio?: string[];
};

export default function ContractorProfilePage({
  params,
}: {
  params: { id?: string };
}) {
  const { user } = useAuth();

  const rawId = params?.id;

  // ✅ guard
  if (typeof rawId !== "string" || rawId.trim().length === 0) {
    return <div className="text-white p-6">Loading…</div>;
  }

  // ✅ now TS knows this is ALWAYS a string
  const contractorId: string = rawId;

  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  const [aiSummary, setAISummary] = useState("");
  const [aiLoading, setAILoading] = useState(false);

  // ---------------------------
  // LOAD PROFILE
  // ---------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      try {
        const ref = doc(db, "contractors", contractorId); // ✅ string
        const snap = await getDoc(ref);

        if (cancelled) return;

        setProfile(snap.exists() ? (snap.data() as ContractorProfile) : null);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [contractorId]);

  // ---------------------------
  // LOAD REVIEWS (LIVE)
  // ---------------------------
  useEffect(() => {
    const colRef = collection(db, "contractors", contractorId, "reviews"); // ✅ string
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const list: Review[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setReviews(list);
    });

    return () => unsub();
  }, [contractorId]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return "0.0";
    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  async function runAITrustSummary() {
    if (!profile) return;

    setAILoading(true);
    try {
      const lines: string[] = [];

      lines.push("Contractor Profile:");
      lines.push(`Name: ${profile.name ?? ""}`);
      lines.push(`Trade: ${profile.trade ?? ""}`);
      lines.push(`Experience: ${profile.experience ?? ""} years`);
      lines.push(`City: ${profile.city ?? ""}`);
      lines.push(`Bio: ${profile.bio ?? ""}`);
      lines.push("");
      lines.push("Reviews Summary:");
      if (reviews.length === 0) {
        lines.push("• No reviews yet.");
      } else {
        for (const r of reviews) lines.push(`• ${r.rating} stars - ${r.text}`);
      }
      lines.push("");
      lines.push("Give a trust assessment, strengths, weaknesses, and recommended job types.");

      const prompt = lines.join("\n");

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      const ai = data.reply || data.error || "";
      setAISummary(ai || "");
    } catch {
      setAISummary("AI summary failed. Please try again.");
    } finally {
      setAILoading(false);
    }
  }

  if (profileLoading && !profile) {
    return (
      <div className="text-white p-6">
        <p>Loading contractor profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-white p-6 space-y-3">
        <p className="text-lg">Contractor not found.</p>
        <Link href="/contractors" className="text-indigo-400 hover:underline text-sm">
          ← Back to contractors
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-8">
      <Link href="/contractors" className="text-indigo-400 hover:underline text-sm">
        ← Back
      </Link>

      <div className="flex gap-6 items-start">
        <Image
          src={profile.photoUrl || "/default-avatar.png"}
          width={120}
          height={120}
          alt="Profile"
          className="rounded-full border border-gray-800"
        />

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-indigo-400">
            {profile.name || "Unnamed Contractor"}
          </h1>

          <p className="text-gray-300 text-sm mt-1">
            {profile.trade || "General Contractor"}
            {typeof profile.experience === "number"
              ? ` • ${profile.experience} yrs experience`
              : ""}
          </p>

          <p className="text-gray-400 text-xs mt-1">
            {profile.city || "Unknown Location"}
          </p>

          <div className="mt-3 flex items-center gap-4">
            <div className="text-3xl">{avgRating} ⭐</div>
            <p className="text-gray-400 text-sm">{reviews.length} reviews</p>
          </div>

          {user && (
            <Link
              href={`/contractors/${contractorId}/reviews/new`}
              className="mt-3 inline-block bg-indigo-600 px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
            >
              Write a Review
            </Link>
          )}
        </div>
      </div>

      <section className="bg-gray-900 p-4 rounded-xl border border-gray-800">
        <h2 className="text-xl font-semibold text-indigo-300">Bio</h2>
        <p className="mt-2 text-sm text-gray-200 whitespace-pre-line">
          {profile.bio || "No bio available."}
        </p>
      </section>

      {Array.isArray(profile.portfolio) && profile.portfolio.length > 0 && (
        <section className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <h2 className="text-xl font-semibold text-indigo-300">Portfolio</h2>
          <div className="flex gap-3 overflow-x-auto mt-3">
            {profile.portfolio.map((url, idx) => (
              <Image
                key={idx}
                src={url}
                width={180}
                height={140}
                alt="Work sample"
                className="rounded-xl border border-gray-700"
              />
            ))}
          </div>
        </section>
      )}

      <section className="bg-gray-900 p-4 rounded-xl border border-gray-800">
        <h2 className="text-xl font-semibold text-indigo-300">Reviews</h2>

        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm mt-2">No reviews yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-gray-800 p-3 rounded-lg border border-gray-700"
              >
                <p className="font-semibold text-yellow-400">⭐ {rev.rating}/5</p>
                <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap">{rev.text}</p>
                <p className="text-gray-500 text-xs mt-2">
                  {rev.createdAt?.toDate ? rev.createdAt.toDate().toLocaleString() : "Recent"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-gray-900 p-4 rounded-xl border border-indigo-600">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-indigo-300">AI Trust & Skill Summary</h2>
          <button
            onClick={runAITrustSummary}
            disabled={aiLoading}
            className="bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {aiLoading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {aiSummary && <p className="mt-3 text-sm whitespace-pre-line">{aiSummary}</p>}
      </section>

      <Link
        href={`/chat?contractor=${contractorId}`}
        className="block bg-green-600 py-3 rounded-xl text-center text-lg hover:bg-green-700"
      >
        Hire Contractor
      </Link>
    </div>
  );
}
