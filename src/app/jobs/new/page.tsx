'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { TRADES, TRADES_FOR_PROMPT } from "@/lib/constants";
import { Zap, Brain, ArrowRight, ArrowLeft, Camera, X, AlertTriangle, CheckCircle, Clock, Calendar, DollarSign, MapPin, Briefcase, Rocket } from "lucide-react";

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

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "emergency", label: "Emergency",  icon: <AlertTriangle className="w-5 h-5 text-red-400" />,    desc: "Needs attention right away" },
  { value: "soon",      label: "Soon",       icon: <Clock className="w-5 h-5 text-yellow-400" />,         desc: "Within the next few days" },
  { value: "flexible",  label: "Flexible",   icon: <Calendar className="w-5 h-5 text-indigo-400" />,      desc: "No rush, schedule at your convenience" },
];

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  low:       { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)",  text: "#34d399", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  moderate:  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", text: "#fbbf24", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  high:      { bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", text: "#fb923c", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  emergency: { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  text: "#f87171", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Describe" },
    { n: 2, label: "AI Review" },
    { n: 3, label: "Post Job" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300"
              style={{
                background: current === s.n ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' :
                            current > s.n  ? 'rgba(99,102,241,0.2)' : 'var(--color-surface)',
                borderColor: current >= s.n ? '#6366f1' : 'var(--color-border)',
                color: current >= s.n ? '#fff' : 'var(--color-text-4)',
                boxShadow: current === s.n ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              {current > s.n ? <CheckCircle className="w-4 h-4" /> : s.n}
            </div>
            <span
              className="text-xs mt-1.5 font-medium"
              style={{ color: current >= s.n ? '#818cf8' : 'var(--color-text-4)' }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="w-20 h-0.5 mx-2 mb-5 transition-all duration-500"
              style={{ background: current > s.n ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'var(--color-border)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel>("flexible");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [detectedTrade, setDetectedTrade] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div
          className="card p-8 text-center max-w-sm w-full"
          style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Sign in required</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-3)' }}>You need to sign in to post a job.</p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

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
        const raw = (data.reply as string) ?? "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* ignore */ }

      const analysisResult: AIAnalysis = parsed ?? {
        trade: "General",
        severity: "moderate",
        summary: data.reply ?? "Problem analyzed. Please confirm the details below.",
      };
      setAnalysis(analysisResult);
      setDetectedTrade(analysisResult.trade);
      if (city.trim()) fetchEstimate(analysisResult.trade, city.trim());
      setStep(2);
    } catch {
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: description.trim(), trade, city: cityVal, urgency }),
      });
      const data = await res.json();
      if (data.estimate) setEstimate(data.estimate);
    } catch { /* estimate is optional */ } finally {
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          description: description.trim(),
          location: { city: city.trim() },
          aiDetectedTrade: detectedTrade || analysis?.trade || null,
          aiSummary: analysis?.summary ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Failed to create job");
      router.push(`/chat?job=${data.jobId}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to post job. Please try again.");
      setSubmitting(false);
    }
  }

  const sev = analysis ? (SEVERITY_STYLES[analysis.severity] ?? SEVERITY_STYLES.moderate) : null;

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Page Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
            <Zap className="w-3 h-3" /> AI-Powered Job Matching
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Post a Repair Job
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
            Describe your issue — our AI diagnoses it and matches you with the best contractor.
          </p>
        </div>

        <StepIndicator current={step} />

        {/* Error Banner */}
        {error && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm flex justify-between items-center animate-fade-in"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 opacity-70 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 1: DESCRIBE ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-up">

            <div className="card p-6 space-y-5">

              {/* Description */}
              <div>
                <label className="label">
                  What's the problem? <span style={{ color: '#f87171' }}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. My kitchen faucet is leaking under the sink and I can see water damage on the cabinet floor. It started about 3 days ago…"
                  rows={5}
                  className="input resize-none"
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-4)' }}>
                  Be as specific as possible — better descriptions get better contractor matches
                </p>
              </div>

              {/* City */}
              <div>
                <label className="label">
                  Your City <span style={{ color: '#f87171' }}>*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Houston, TX"
                    className="input pl-9"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="label">
                  Add a Photo <span style={{ color: 'var(--color-text-4)', fontWeight: 400 }}>(optional — helps AI diagnose faster)</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {imagePreview ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                    <img
                      src={imagePreview}
                      alt="Job preview"
                      className="w-full max-h-56 object-cover"
                    />
                    <button
                      onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-xl py-10 text-center transition-all duration-200 group"
                    style={{
                      border: '2px dashed var(--color-border)',
                      background: 'transparent',
                      color: 'var(--color-text-4)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#6366f1';
                      (e.currentTarget as HTMLElement).style.color = '#818cf8';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-text-4)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div className="text-sm font-medium">Click to upload a photo</div>
                    <div className="text-xs mt-1 opacity-60">JPG, PNG, HEIC up to 10MB</div>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={runAIAnalysis}
              disabled={!description.trim() || !city.trim() || aiLoading}
              className="btn btn-primary btn-full btn-lg"
            >
              {aiLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity=".25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI is analyzing your problem…
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Analyze with AI
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: AI REVIEW ────────────────────────────────────────── */}
        {step === 2 && analysis && (
          <div className="space-y-5 animate-fade-up">

            {/* AI Diagnosis Card */}
            <div
              className="card p-6 space-y-4"
              style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'var(--color-surface)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>AI Diagnosis</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Powered by GPT-4</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{analysis.summary}</p>

              {/* Severity Badge */}
              {sev && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: sev.bg, border: `1px solid ${sev.border}`, color: sev.text }}
                >
                  {sev.icon}
                  {analysis.severity.charAt(0).toUpperCase() + analysis.severity.slice(1)} Severity
                </div>
              )}

              {/* Trade Selector */}
              <div>
                <label className="label">
                  Detected Trade <span style={{ color: 'var(--color-text-4)', fontWeight: 400 }}>(you can change this)</span>
                </label>
                <select
                  value={detectedTrade}
                  onChange={(e) => {
                    setDetectedTrade(e.target.value);
                    if (city.trim()) fetchEstimate(e.target.value, city.trim());
                  }}
                  className="input"
                >
                  {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Cost Estimate Card */}
            <div className="card p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <DollarSign className="w-4 h-4" style={{ color: '#34d399' }} />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Cost Estimate</h2>
                </div>
                {estimateLoading && (
                  <span className="text-xs animate-pulse" style={{ color: 'var(--color-text-4)' }}>Loading…</span>
                )}
              </div>

              {estimate ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Low",     value: estimate.price_low_usd,     color: '#34d399' },
                      { label: "Typical", value: estimate.price_typical_usd, color: '#fbbf24' },
                      { label: "High",    value: estimate.price_high_usd,    color: '#f87171' },
                    ].map((r) => (
                      <div
                        key={r.label}
                        className="rounded-xl p-3 text-center"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                      >
                        <div className="text-lg font-bold" style={{ color: r.color }}>${r.value.toLocaleString()}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{r.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-4)' }}>{estimate.why_this_range}</p>
                  {estimate.scope_of_work?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-3)' }}>Likely scope of work:</p>
                      <ul className="space-y-1">
                        {estimate.scope_of_work.slice(0, 4).map((s, i) => (
                          <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--color-text-4)' }}>
                            <span style={{ color: '#6366f1' }}>•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : !estimateLoading ? (
                <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
                  Estimate unavailable.{" "}
                  <button
                    onClick={() => fetchEstimate(detectedTrade, city.trim())}
                    className="underline transition-opacity hover:opacity-70"
                    style={{ color: '#818cf8' }}
                  >
                    Try again
                  </button>
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton rounded-xl p-3 h-16" />
                  ))}
                </div>
              )}
            </div>

            {/* Urgency */}
            <div className="card p-6">
              <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>How urgent is this?</h2>
              <div className="grid grid-cols-3 gap-3">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUrgency(opt.value)}
                    className="p-4 rounded-xl text-center transition-all duration-200"
                    style={{
                      border: urgency === opt.value ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--color-border)',
                      background: urgency === opt.value ? 'rgba(99,102,241,0.1)' : 'var(--color-surface-2)',
                    }}
                  >
                    <div className="flex justify-center mb-2">{opt.icon}</div>
                    <div className="text-xs font-semibold mb-0.5" style={{ color: urgency === opt.value ? '#a5b4fc' : 'var(--color-text-2)' }}>
                      {opt.label}
                    </div>
                    <div className="text-[10px] leading-tight" style={{ color: 'var(--color-text-4)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(3)} className="btn btn-primary flex-[2]">
                Review & Post <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRM & SUBMIT ──────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-up">

            {/* Review Card */}
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>Review Your Job</h2>

              <div className="space-y-3">
                {[
                  { icon: <Brain className="w-4 h-4" />,    label: "Problem",  value: description },
                  { icon: <Briefcase className="w-4 h-4" />, label: "Trade",    value: detectedTrade || "General" },
                  { icon: <MapPin className="w-4 h-4" />,    label: "Location", value: city },
                  { icon: <Clock className="w-4 h-4" />,     label: "Urgency",  value: urgency.charAt(0).toUpperCase() + urgency.slice(1) },
                  ...(estimate ? [{ icon: <DollarSign className="w-4 h-4" />, label: "Est. Cost", value: `$${estimate.price_low_usd.toLocaleString()} – $${estimate.price_high_usd.toLocaleString()}` }] : []),
                ].map(({ icon, label, value }) => (
                  <div
                    key={label}
                    className="flex gap-3 py-3 rounded-lg px-3"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    <span style={{ color: 'var(--color-text-4)' }} className="mt-0.5 flex-shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</div>
                      <div className="text-sm" style={{ color: label === "Est. Cost" ? '#34d399' : 'var(--color-text-2)' }}>
                        {value}
                      </div>
                    </div>
                  </div>
                ))}

                {imagePreview && (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                    <img src={imagePreview} alt="Job" className="w-full max-h-40 object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* What happens next */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: '#a5b4fc' }}>What happens next?</p>
              <ul className="space-y-1.5">
                {[
                  "Your job is posted and our AI starts matching contractors",
                  "Top contractors in your area will be notified immediately",
                  "You can chat with matched contractors in your job thread",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs" style={{ color: '#818cf8' }}>
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn btn-secondary flex-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-primary flex-[2]"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity=".25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Posting job…
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Post Job & Find Contractors
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
