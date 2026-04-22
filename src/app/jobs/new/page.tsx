'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { TRADES, TRADES_FOR_PROMPT } from "@/lib/constants";

type UrgencyLevel = "emergency" | "soon" | "flexible";

type AIAnalysis = {
  trade: string;
  severity: "low" | "moderate" | "high" | "emergency";
  summary: string;
};

type Estimate = {
  price_low_usd: number;
  price_typical_usd: number;
  price_high_usd: number;
  labor_hours_low: number;
  labor_hours_high: number;
  why_this_range: string;
  questions_to_confirm: string[];
  scope_of_work: string[];
  risk_factors: string[];
};

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; icon: string; desc: string }[] = [
  { value: "emergency", label: "Emergency", icon: "🚨", desc: "Needs attention right away" },
  { value: "soon",      label: "Soon",      icon: "⏰", desc: "Within the next few days" },
  { value: "flexible",  label: "Flexible",  icon: "📅", desc: "No rush, schedule at your convenience" },
];

const SEVERITY_COLOR: Record<string, string> = {
  low:       "text-green-400 bg-green-900/30 border-green-700",
  moderate:  "text-yellow-400 bg-yellow-900/30 border-yellow-700",
  high:      "text-orange-400 bg-orange-900/30 border-orange-700",
  emergency: "text-red-400 bg-red-900/30 border-red-700",
};

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Describe" },
    { n: 2, label: "AI Review" },
    { n: 3, label: "Post Job" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition
              ${current === s.n ? "bg-indigo-600 border-indigo-400 text-white" :
                current > s.n ? "bg-indigo-900 border-indigo-500 text-indigo-300" :
                "bg-gray-800 border-gray-700 text-gray-500"}`}>
              {current > s.n ? "✓" : s.n}
            </div>
            <span className={`text-xs mt-1 font-medium ${current >= s.n ? "text-indigo-300" : "text-gray-600"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 h-0.5 mx-1 mb-4 transition ${current > s.n ? "bg-indigo-600" : "bg-gray-800"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useAuth();

  /* ── Step state ──────────────────────────────────────────────────────── */
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* ── Form fields ─────────────────────────────────────────────────────── */
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel>("flexible");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  /* ── AI results ──────────────────────────────────────────────────────── */
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [detectedTrade, setDetectedTrade] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);

  /* ── Submit state ────────────────────────────────────────────────────── */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Auth guard ──────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">You need to sign in to post a job.</p>
        <Link
          href="/auth/signin"
          className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-lg text-sm font-medium transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  /* ── Handlers ────────────────────────────────────────────────────────── */
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function runAIAnalysis() {
    if (!description.trim()) return;
    setAiLoading(true);
    setError(null);

    try {
      // 1. Analyze the problem with AI
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `You are analyzing a service request. The customer says: "${description.trim()}".
            Respond with ONLY a JSON object (no markdown, no extra text):
            { "trade": "<best matching trade from: ${TRADES_FOR_PROMPT}>",
              "severity": "<low|moderate|high|emergency>",
              "summary": "<1-2 sentence plain-English summary of the problem and likely cause>" }`,
          imageUrl: imagePreview,
          mode: "homeowner",
        }),
      });
      const data = await res.json();

      let parsed: AIAnalysis | null = null;
      try {
        // Try to parse JSON from the reply
        const raw = (data.reply as string) ?? "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback if AI didn't return clean JSON
      }

      const analysisResult: AIAnalysis = parsed ?? {
        trade: "General",
        severity: "moderate",
        summary: data.reply ?? "Problem analyzed. Please confirm the details below.",
      };

      setAnalysis(analysisResult);
      setDetectedTrade(analysisResult.trade);

      // 2. Get cost estimate if we have city
      if (city.trim()) {
        fetchEstimate(analysisResult.trade, city.trim());
      }

      setStep(2);
    } catch (err: any) {
      setError("AI analysis failed. You can still post the job manually.");
      setAnalysis({ trade: "General", severity: "moderate", summary: description.trim() });
      setDetectedTrade("General");
      setStep(2);
    } finally {
      setAiLoading(false);
    }
  }

  async function fetchEstimate(trade: string, cityVal: string) {
    setEstimateLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/estimate-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: description.trim(),
          trade,
          city: cityVal,
          urgency,
        }),
      });
      const data = await res.json();
      if (data.estimate) setEstimate(data.estimate);
    } catch {
      // estimate is optional — silently skip
    } finally {
      setEstimateLoading(false);
    }
  }

  async function handleSubmit() {
    if (!description.trim() || !city.trim()) {
      setError("Please fill in the description and city.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/create-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: description.trim(),
          location: { city: city.trim() },
          aiDetectedTrade: detectedTrade || analysis?.trade || null,
          aiSummary: analysis?.summary ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Failed to create job");
      }

      router.push(`/chat?job=${data.jobId}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to post job. Please try again.");
      setSubmitting(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-indigo-400">Post a Repair Job</h1>
          <p className="text-gray-500 text-sm mt-1">
            Describe your issue and AI will help diagnose it and match you with a contractor.
          </p>
        </div>

        <StepIndicator current={step} />

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ── STEP 1: DESCRIBE ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What's the problem? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. My kitchen faucet is leaking under the sink and I can see water damage on the cabinet floor. It started about 3 days ago…"
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-600"
                />
                <p className="text-xs text-gray-600 mt-1">Be as specific as possible — better descriptions get better matches</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your City <span className="text-red-400">*</span>
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Austin, TX"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600"
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Add a Photo <span className="text-gray-500">(optional — helps AI diagnose faster)</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="Job preview"
                      className="w-full max-h-48 object-cover rounded-lg border border-gray-700"
                    />
                    <button
                      onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute top-2 right-2 bg-gray-900/80 hover:bg-red-900 text-white w-7 h-7 rounded-full text-xs flex items-center justify-center transition"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-xl py-8 text-center text-gray-500 hover:text-indigo-400 transition text-sm"
                  >
                    <div className="text-3xl mb-2">📷</div>
                    <div>Click to upload a photo</div>
                    <div className="text-xs mt-1 text-gray-600">JPG, PNG, HEIC up to 10MB</div>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={runAIAnalysis}
              disabled={!description.trim() || !city.trim() || aiLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {aiLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  AI is analyzing your problem…
                </>
              ) : (
                <>🧠 Analyze with AI →</>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: AI REVIEW ────────────────────────────────────────── */}
        {step === 2 && analysis && (
          <div className="space-y-5">

            {/* AI Summary Card */}
            <div className="bg-gray-900 border border-indigo-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🤖</span>
                <h2 className="font-semibold text-indigo-300">AI Diagnosis</h2>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>

              <div className="flex flex-wrap gap-3">
                {/* Severity */}
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${SEVERITY_COLOR[analysis.severity] ?? SEVERITY_COLOR.moderate}`}>
                  {analysis.severity === "emergency" ? "🚨" :
                   analysis.severity === "high" ? "⚠️" :
                   analysis.severity === "moderate" ? "🔔" : "✅"}{" "}
                  {analysis.severity.charAt(0).toUpperCase() + analysis.severity.slice(1)} Severity
                </div>
              </div>

              {/* Trade selector */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Detected Trade <span className="text-gray-600">(you can change this)</span>
                </label>
                <select
                  value={detectedTrade}
                  onChange={(e) => {
                    setDetectedTrade(e.target.value);
                    if (city.trim()) fetchEstimate(e.target.value, city.trim());
                  }}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {TRADES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Cost Estimate */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💰</span>
                <h2 className="font-semibold text-gray-200">Cost Estimate</h2>
                {estimateLoading && (
                  <span className="text-xs text-gray-500 animate-pulse ml-auto">Loading estimate…</span>
                )}
              </div>

              {estimate ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Low", value: estimate.price_low_usd, color: "text-green-400" },
                      { label: "Typical", value: estimate.price_typical_usd, color: "text-yellow-400" },
                      { label: "High", value: estimate.price_high_usd, color: "text-red-400" },
                    ].map((r) => (
                      <div key={r.label} className="bg-gray-800 rounded-lg p-3 text-center">
                        <div className={`text-lg font-bold ${r.color}`}>${r.value.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{estimate.why_this_range}</p>

                  {estimate.scope_of_work?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Likely scope of work:</p>
                      <ul className="text-xs text-gray-500 space-y-0.5">
                        {estimate.scope_of_work.slice(0, 4).map((s, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-indigo-500 flex-shrink-0">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : !estimateLoading ? (
                <p className="text-sm text-gray-500">
                  Estimate unavailable.{" "}
                  <button
                    onClick={() => fetchEstimate(detectedTrade, city.trim())}
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Try again
                  </button>
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3 text-center animate-pulse">
                      <div className="h-6 bg-gray-700 rounded w-16 mx-auto mb-1" />
                      <div className="h-3 bg-gray-700 rounded w-10 mx-auto" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Urgency */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-gray-200 mb-3">How urgent is this?</h2>
              <div className="grid grid-cols-3 gap-3">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUrgency(opt.value)}
                    className={`p-3 rounded-xl border text-center transition ${
                      urgency === opt.value
                        ? "border-indigo-500 bg-indigo-900/30 text-white"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-xl mb-1">{opt.icon}</div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm py-3 rounded-xl transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 font-semibold text-sm py-3 rounded-xl transition"
              >
                Review & Post →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRM & SUBMIT ──────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-200">Review Your Job</h2>

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">Problem</span>
                  <span className="text-gray-200">{description}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">Trade</span>
                  <span className="text-white font-medium">{detectedTrade || "General"}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">Location</span>
                  <span className="text-gray-200">{city}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">Urgency</span>
                  <span className="text-gray-200 capitalize">{urgency}</span>
                </div>
                {estimate && (
                  <div className="flex gap-3">
                    <span className="text-gray-500 w-24 flex-shrink-0">Est. Cost</span>
                    <span className="text-green-400">
                      ${estimate.price_low_usd.toLocaleString()} – ${estimate.price_high_usd.toLocaleString()}
                    </span>
                  </div>
                )}
                {imagePreview && (
                  <div className="flex gap-3">
                    <span className="text-gray-500 w-24 flex-shrink-0">Photo</span>
                    <img src={imagePreview} alt="Job" className="w-20 h-14 object-cover rounded-lg border border-gray-700" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 text-sm text-indigo-300">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="text-indigo-400 space-y-1 text-xs">
                <li>✅ Your job is posted and our AI starts matching contractors</li>
                <li>📬 Top contractors in your area will be notified immediately</li>
                <li>💬 You can chat with matched contractors in your job thread</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm py-3 rounded-xl transition"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 font-semibold text-sm py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Posting job…
                  </>
                ) : (
                  "🚀 Post Job & Find Contractors"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
