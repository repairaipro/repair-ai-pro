"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

type RankedContractor = {
  id: string;
  name: string;
  trade: string;
  city: string;
  experience: number;
  bio: string;
  photoUrl: string;
  portfolioCount: number;
  reviewCount: number;
  avgRating: number;

  matchScore: number;
  reason: string;
  strengths: string[];
  risks: string[];
  recommendedJobTypes: string[];
};

type Estimate = {
  price_low_usd: number;
  price_typical_usd: number;
  price_high_usd: number;
  labor_hours_low: number;
  labor_hours_high: number;
  materials_allowance_usd: number;
  why_this_range: string;
  questions_to_confirm: string[];
  scope_of_work: string[];
  risk_factors: string[];
};

type BidPack = {
  title: string;
  summary: string;
  scope_of_work: string[];
  questions_to_confirm: string[];
  photo_requests: string[];
  bid_format: string[];
  safety_or_access_notes: string[];
};

export function RankedContractors() {
  const { user } = useAuth();

  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState("Plumber");
  const [city, setCity] = useState("Houston");
  const [urgency, setUrgency] = useState<"emergency" | "soon" | "flexible">(
    "flexible"
  );

  const [loading, setLoading] = useState(false);
  const [ranked, setRanked] = useState<RankedContractor[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState("");

  // ✅ This is the key for Step 7 success:
  // We create a Job thread ONCE and reuse it.
  const [jobId, setJobId] = useState<string | null>(null);

  async function ensureJobExists(): Promise<string> {
    if (!user) throw new Error("Please sign in first.");
    if (jobId) return jobId;

    // Create a job conversation thread automatically
    const docRef = await addDoc(collection(db, "jobs"), {
      description: description.trim(),
      trade: trade.trim(),
      location: city.trim(),
      status: "open",
      userId: user.uid,

      // (Optional) extra metadata that helps later
      urgency,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: "match",
    });

    setJobId(docRef.id);
    return docRef.id;
  }

  function buildBidMessage(bidPack: BidPack, est: Estimate | null) {
    const parts: string[] = [];

    parts.push(`JOB: ${bidPack.title}`);
    if (bidPack.summary) parts.push(`\nSUMMARY:\n${bidPack.summary}`);

    if (est) {
      parts.push(
        `\nBUDGET RANGE (AI ESTIMATE): $${est.price_low_usd} – $${est.price_high_usd} (typical $${est.price_typical_usd})`
      );
      parts.push(
        `Estimated labor: ${est.labor_hours_low}–${est.labor_hours_high} hrs`
      );
    }

    if (bidPack.scope_of_work?.length) {
      parts.push("\nSCOPE OF WORK:");
      bidPack.scope_of_work.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
    }

    if (bidPack.questions_to_confirm?.length) {
      parts.push("\nQUESTIONS:");
      bidPack.questions_to_confirm.forEach((q) => parts.push(`• ${q}`));
    }

    if (bidPack.photo_requests?.length) {
      parts.push("\nPHOTOS REQUESTED:");
      bidPack.photo_requests.forEach((p) => parts.push(`• ${p}`));
    }

    if (bidPack.safety_or_access_notes?.length) {
      parts.push("\nACCESS / SAFETY NOTES:");
      bidPack.safety_or_access_notes.forEach((n) => parts.push(`• ${n}`));
    }

    if (bidPack.bid_format?.length) {
      parts.push("\nPLEASE REPLY WITH:");
      bidPack.bid_format.forEach((b) => parts.push(`• ${b}`));
    }

    parts.push("\nThanks — please share your quote and earliest availability.");
    return parts.join("\n");
  }

  async function sendBidPack(contractorId: string) {
    setError("");

    if (!user) {
      setError("Please sign in first.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the problem first.");
      return;
    }

    setLoading(true);
    try {
      const jid = await ensureJobExists();

      const res = await fetch("/api/bid-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          trade,
          city,
          urgency,
          estimate: estimate
            ? {
                price_low_usd: estimate.price_low_usd,
                price_typical_usd: estimate.price_typical_usd,
                price_high_usd: estimate.price_high_usd,
                labor_hours_low: estimate.labor_hours_low,
                labor_hours_high: estimate.labor_hours_high,
              }
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Bid pack failed");

      const bidPack = data?.bidPack as BidPack;
      const message = buildBidMessage(bidPack, estimate);

      // ✅ BEST UX: job-based chat thread + prefilled message
      const url =
        `/chat?job=${encodeURIComponent(jid)}` +
        `&contractor=${encodeURIComponent(contractorId)}` +
        `&prefill=${encodeURIComponent(message)}`;

      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || "Failed to generate bid pack");
    } finally {
      setLoading(false);
    }
  }

  async function runAI() {
    setError("");
    setRanked([]);
    setEstimate(null);

    if (!user) {
      setError("Please sign in first.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the problem.");
      return;
    }

    setLoading(true);
    try {
      // ✅ Create the job thread immediately so chat always works
      await ensureJobExists();

      const rankReq = fetch("/api/rank-contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, trade, city, urgency }),
      });

      const estReq = fetch("/api/estimate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, trade, city, urgency }),
      });

      const [rankRes, estRes] = await Promise.all([rankReq, estReq]);

      const rankData = await rankRes.json();
      const estData = await estRes.json();

      if (!rankRes.ok) throw new Error(rankData?.error || "Ranking failed");
      if (!estRes.ok) throw new Error(estData?.error || "Estimate failed");

      setRanked(rankData?.ranked ?? []);
      setEstimate(estData?.estimate ?? null);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* INPUT CARD */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 space-y-3">
        <h2 className="text-xl font-semibold text-indigo-300">
          AI Match + Price Estimate
        </h2>

        <textarea
          className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white text-sm"
          rows={4}
          placeholder="Describe your problem (e.g., 'kitchen sink leaking under cabinet, water damage...')"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-white text-sm"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            placeholder="Trade (Plumber, Electrician...)"
          />
          <input
            className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-white text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
          />
          <select
            className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-white text-sm"
            value={urgency}
            onChange={(e) =>
              setUrgency(e.target.value as "emergency" | "soon" | "flexible")
            }
          >
            <option value="flexible">Flexible</option>
            <option value="soon">Soon</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        <button
          onClick={runAI}
          disabled={loading}
          className="bg-indigo-600 px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Find Best Contractors"}
        </button>

        {error ? <p className="text-red-400 text-sm">{error}</p> : null}

        {/* Optional helper */}
        {jobId ? (
          <p className="text-[11px] text-gray-500">
            Job thread created: <span className="text-gray-300">{jobId}</span>
          </p>
        ) : null}
      </div>

      {/* ESTIMATE CARD */}
      {estimate ? (
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-gray-400 text-sm">Estimated price range</p>
              <p className="text-3xl font-bold text-green-400">
                ${estimate.price_low_usd} – ${estimate.price_high_usd}
              </p>
              <p className="text-gray-300 text-sm">
                Typical:{" "}
                <span className="font-semibold">${estimate.price_typical_usd}</span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-gray-400 text-sm">Labor hours</p>
              <p className="text-xl font-semibold">
                {estimate.labor_hours_low}–{estimate.labor_hours_high} hrs
              </p>
              <p className="text-gray-400 text-sm">
                Materials allowance: ${estimate.materials_allowance_usd}
              </p>
            </div>
          </div>

          <p className="text-gray-200 text-sm whitespace-pre-line">
            {estimate.why_this_range}
          </p>
        </div>
      ) : null}

      {/* RANKED CONTRACTORS */}
      {ranked.length ? (
        <div className="space-y-4">
          {ranked.map((c, idx) => (
            <div
              key={c.id}
              className="bg-gray-900 p-4 rounded-xl border border-gray-800"
            >
              <div className="flex items-start gap-4">
                <Image
                  src={c.photoUrl || "/default-avatar.png"}
                  width={64}
                  height={64}
                  alt="Profile"
                  className="rounded-full border border-gray-800"
                />

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {idx === 0 ? "🏆 " : ""}
                        {c.name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {c.trade} • {c.city} • {c.experience} yrs
                      </p>
                      <p className="text-gray-400 text-sm">
                        {c.avgRating} ⭐ ({c.reviewCount} reviews)
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">
                        {c.matchScore}%
                      </p>
                      <p className="text-gray-400 text-xs">match</p>
                    </div>
                  </div>

                  <p className="mt-3 text-gray-200 text-sm">{c.reason}</p>

                  <div className="mt-3 flex gap-3 flex-wrap">
                    <Link
                      href={`/contractor/${c.id}`}
                      className="text-indigo-400 hover:underline text-sm"
                    >
                      View Profile
                    </Link>

                    <button
                      type="button"
                      className="text-sm text-indigo-200 hover:text-indigo-100 underline disabled:opacity-60"
                      disabled={loading}
                      onClick={() => sendBidPack(c.id)}
                    >
                      {loading ? "Generating..." : "Send Bid Pack"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !ranked.length ? (
        <p className="text-gray-500 text-sm">
          Submit a job description to see estimate + ranked contractors.
        </p>
      ) : null}
    </div>
  );
}
