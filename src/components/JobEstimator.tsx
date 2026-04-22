"use client";

import { useState } from "react";

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

export function JobEstimator() {
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState("Plumber");
  const [city, setCity] = useState("Houston");
  const [urgency, setUrgency] = useState<"emergency" | "soon" | "flexible">("flexible");

  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState("");

  async function runEstimate() {
    setError("");
    setEstimate(null);

    if (!description.trim()) {
      setError("Please describe the job.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/estimate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, trade, city, urgency }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Estimate failed");

      setEstimate(data.estimate);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 space-y-3">
        <h2 className="text-xl font-semibold text-indigo-300">AI Price Estimate</h2>

        <textarea
          className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white text-sm"
          rows={4}
          placeholder="Describe the job (symptoms, location in home, any damage, etc.)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-white text-sm"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            placeholder="Trade"
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
            onChange={(e) => setUrgency(e.target.value as any)}
          >
            <option value="flexible">Flexible</option>
            <option value="soon">Soon</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        <button
          onClick={runEstimate}
          disabled={loading}
          className="bg-indigo-600 px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Estimating..." : "Get Estimate"}
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {estimate && (
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-gray-400 text-sm">Estimated price range</p>
              <p className="text-3xl font-bold text-green-400">
                ${estimate.price_low_usd} – ${estimate.price_high_usd}
              </p>
              <p className="text-gray-300 text-sm">
                Typical: <span className="font-semibold">${estimate.price_typical_usd}</span>
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

          {estimate.questions_to_confirm?.length > 0 && (
            <div>
              <p className="text-indigo-300 font-semibold">Questions to confirm</p>
              <ul className="list-disc ml-5 text-sm text-gray-200 mt-1 space-y-1">
                {estimate.questions_to_confirm.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {estimate.scope_of_work?.length > 0 && (
            <div>
              <p className="text-indigo-300 font-semibold">Suggested scope of work</p>
              <ul className="list-decimal ml-5 text-sm text-gray-200 mt-1 space-y-1">
                {estimate.scope_of_work.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {estimate.risk_factors?.length > 0 && (
            <div>
              <p className="text-yellow-300 font-semibold">Risk factors</p>
              <ul className="list-disc ml-5 text-sm text-gray-200 mt-1 space-y-1">
                {estimate.risk_factors.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
