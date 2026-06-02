'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { TRADES, TRADES_FOR_PROMPT } from "@/lib/constants";
import VoiceRecorder from "@/components/VoiceRecorder";
import EmergencyBanner from "@/components/EmergencyBanner";
import LocationInput, { LocationData } from "@/components/LocationInput";
import {
  Zap,
  Brain,
  ArrowRight,
  ArrowLeft,
  Camera,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  MapPin,
  Briefcase,
  Rocket,
  Mic,
  PenLine,
  ShoppingCart,
  ExternalLink,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type UrgencyLevel = "emergency" | "soon" | "flexible";
type InputMode = "speak" | "photo" | "type";

type AIAnalysis = {
  trade: string;
  severity: "low" | "moderate" | "high" | "emergency";
  summary: string;
  clarifyingQuestions?: string[];
  confidence?: "high" | "medium" | "low";
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

type Part = {
  name: string;
  estimatedPrice: string;
  why: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "emergency", label: "Emergency", icon: <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} />, desc: "Needs attention right away" },
  { value: "soon",      label: "Soon",      icon: <Clock className="w-5 h-5" style={{ color: '#fbbf24' }} />,        desc: "Within the next few days" },
  { value: "flexible",  label: "Flexible",  icon: <Calendar className="w-5 h-5" style={{ color: '#818cf8' }} />,    desc: "No rush, schedule at your convenience" },
];

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  low:       { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)",  text: "#34d399", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  moderate:  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", text: "#fbbf24", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  high:      { bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", text: "#fb923c", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  emergency: { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  text: "#f87171", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const EMERGENCY_FEE = 35;

// ─── Mode card ───────────────────────────────────────────────────────────────

function ModeCard({
  label,
  icon,
  description,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 text-center"
      style={{
        border: active ? '1.5px solid rgba(99,102,241,0.55)' : '1px solid var(--color-border)',
        background: active ? 'rgba(99,102,241,0.1)' : 'var(--color-surface-2)',
        cursor: 'pointer',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--color-surface)',
          color: active ? '#fff' : 'var(--color-text-3)',
        }}
      >
        {icon}
      </div>
      <span className="text-sm font-semibold" style={{ color: active ? '#a5b4fc' : 'var(--color-text-2)' }}>
        {label}
      </span>
      <span className="text-[11px] leading-snug" style={{ color: 'var(--color-text-4)' }}>
        {description}
      </span>
    </button>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

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
                background: current === s.n
                  ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                  : current > s.n
                  ? 'rgba(99,102,241,0.2)'
                  : 'var(--color-surface)',
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
              style={{
                background: current > s.n
                  ? 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                  : 'var(--color-border)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [activeMode, setActiveMode] = useState<InputMode>("type");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationData>({});
  const [urgency, setUrgency] = useState<UrgencyLevel>("flexible");
  const [isEmergencyPremium, setIsEmergencyPremium] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [skipAIAnalysis, setSkipAIAnalysis] = useState(false);

  // Step 2
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [detectedTrade, setDetectedTrade] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [skipQuestions, setSkipQuestions] = useState(false);

  // Shared loading/error
  const [aiLoading, setAiLoading] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="card p-8 text-center max-w-sm w-full" style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <Briefcase className="w-6 h-6" style={{ color: '#fff' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Sign in required</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-3)' }}>You need to sign in to post a job.</p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">Sign In to Continue</Link>
        </div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleImageSelectFromRef(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage(refEl: React.RefObject<HTMLInputElement | null>) {
    setImagePreview(null);
    if (refEl.current) refEl.current.value = "";
  }

  async function runAIAnalysis() {
    const hasLocation = location.zipcode || (location.city && location.state) || location.address;
    if (!description.trim() || !hasLocation) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `You are diagnosing a home repair problem. The customer describes: "${description.trim()}".

First, identify the trade. Then assess if you have enough information to diagnose accurately.
If uncertain about the diagnosis (could be multiple issues), ask 2-3 clarifying questions.

Respond with ONLY a JSON object:
{
  "trade": "<best matching trade from: ${TRADES_FOR_PROMPT}>",
  "severity": "<low|moderate|high|emergency>",
  "summary": "<1-2 sentence diagnosis>",
  "clarifyingQuestions": ["<question 1>", "<question 2>"],
  "confidence": "<high|medium|low>"
}

CRITICAL: If you're not confident, ask clarifying questions rather than guessing. Better to ask than to misdiagnose.`,
          imageUrl: imagePreview,
          mode: "homeowner",
        }),
      });
      const data = await res.json();
      let parsed: AIAnalysis | null = null;
      try {
        const raw = (data.reply as string) ?? "";
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      } catch { /* ignore */ }

      const result: AIAnalysis = parsed ?? {
        trade: "General",
        severity: "moderate",
        summary: data.reply ?? "Problem analyzed. Please confirm the details below.",
      };

      setAnalysis(result);
      setDetectedTrade(result.trade);
      if (hasLocation) fetchEstimate(result.trade, location);
      fetchParts(result.trade, description.trim());
      setStep(2);
    } catch {
      setError("AI analysis failed. You can still post the job manually.");
      const fallback: AIAnalysis = { trade: "General", severity: "moderate", summary: description.trim() };
      setAnalysis(fallback);
      setDetectedTrade("General");
      setStep(2);
    } finally {
      setAiLoading(false);
    }
  }

  async function fetchEstimate(trade: string, loc: LocationData) {
    setEstimateLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/estimate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: description.trim(), trade, location: loc, urgency }),
      });
      const data = await res.json();
      if (data.estimate) setEstimate(data.estimate);
    } catch { /* estimate is optional */ }
    finally { setEstimateLoading(false); }
  }

  async function fetchParts(trade: string, desc: string) {
    setPartsLoading(true);
    try {
      const res = await fetch("/api/parts-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade, description: desc }),
      });
      const data = await res.json();
      if (Array.isArray(data.parts)) setParts(data.parts as Part[]);
    } catch { /* parts are optional */ }
    finally { setPartsLoading(false); }
  }

  async function handleSubmit() {
    const hasLocation = location.zipcode || (location.city && location.state) || location.address;
    if (!description.trim() || !hasLocation) {
      setError("Please fill in the description and location.");
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
          location,
          aiDetectedTrade: detectedTrade || analysis?.trade || null,
          aiSummary: analysis?.summary ?? null,
          urgency,
          isEmergency: urgency === "emergency",
          emergencyFeeUsd: urgency === "emergency" && isEmergencyPremium ? EMERGENCY_FEE : 0,
          trade: detectedTrade || analysis?.trade || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.jobId) throw new Error(data.error ?? "Failed to create job");
      // Go to job detail — shows progress tracker + live bid updates
      router.push(`/jobs/${data.jobId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post job. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  }

  const sev = analysis ? (SEVERITY_STYLES[analysis.severity] ?? SEVERITY_STYLES.moderate) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
          >
            <Zap className="w-3 h-3" />
            AI-Powered Job Matching
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>What needs fixing?</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
            Describe your issue — our AI diagnoses it and matches you with the best contractor.
          </p>
        </div>

        <StepIndicator current={step} />

        {/* Error banner */}
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

        {/* ═══════════════════════════════════════════════════════════════
            STEP 1 — DESCRIBE YOUR PROBLEM
        ═══════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-up">
            <div className="card p-6 space-y-6">

              {/* Input mode selector */}
              <div>
                <p className="label mb-3">How would you like to describe the problem?</p>
                <div className="grid grid-cols-3 gap-3">
                  <ModeCard
                    label="Speak it"
                    icon={<Mic className="w-5 h-5" />}
                    description="Use your voice"
                    active={activeMode === "speak"}
                    onClick={() => setActiveMode("speak")}
                  />
                  <ModeCard
                    label="Show a Photo"
                    icon={<Camera className="w-5 h-5" />}
                    description="Upload an image"
                    active={activeMode === "photo"}
                    onClick={() => setActiveMode("photo")}
                  />
                  <ModeCard
                    label="Type it"
                    icon={<PenLine className="w-5 h-5" />}
                    description="Write it out"
                    active={activeMode === "type"}
                    onClick={() => setActiveMode("type")}
                  />
                </div>
                <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-4)' }}>
                  You can use any combination — these just highlight your primary method.
                </p>
              </div>

              {/* Voice panel */}
              {activeMode === "speak" && (
                <div
                  className="rounded-xl p-5 flex flex-col items-center gap-3"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>
                    Tap the mic and describe your problem out loud
                  </p>
                  <VoiceRecorder
                    size="lg"
                    onTranscript={(text) => {
                      setDescription((prev) => prev ? prev + " " + text : text);
                      setVoiceError(null);
                    }}
                    onError={(msg) => setVoiceError(msg)}
                  />
                  {voiceError && (
                    <p className="text-xs text-center" style={{ color: '#f87171' }}>{voiceError}</p>
                  )}
                  <p className="text-xs text-center" style={{ color: 'var(--color-text-4)' }}>
                    Your transcript will appear in the text area below. You can edit it.
                  </p>
                </div>
              )}

              {/* Photo panel (primary mode) */}
              {activeMode === "photo" && (
                <div>
                  <label className="label mb-2">
                    Upload a Photo{" "}
                    <span style={{ color: 'var(--color-text-4)', fontWeight: 400 }}>(optional — helps AI diagnose faster)</span>
                  </label>
                  <input
                    ref={photoFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelectFromRef}
                  />
                  {imagePreview ? (
                    <div className="relative w-full rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                      <img src={imagePreview} alt="Job preview" className="w-full max-h-56 object-cover" />
                      <button
                        onClick={() => clearImage(photoFileRef)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoFileRef.current?.click()}
                      className="w-full rounded-xl py-10 text-center transition-all duration-200"
                      style={{ border: '2px dashed var(--color-border)', background: 'transparent', color: 'var(--color-text-4)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#6366f1';
                        (e.currentTarget as HTMLElement).style.color = '#818cf8';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)';
                      }}
                      onMouseLeave={(e) => {
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
              )}

              {/* Description textarea — always visible */}
              <div>
                <label className="label">
                  Describe the problem <span style={{ color: '#f87171' }}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. My kitchen faucet is leaking under the sink and I can see water damage on the cabinet floor. It started about 3 days ago…"
                  rows={5}
                  className="input resize-none"
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-4)' }}>
                  Be as specific as possible — better descriptions get better contractor matches.
                </p>
              </div>

              {/* Optional photo add-on when NOT in photo mode */}
              {activeMode !== "photo" && (
                <div>
                  <label className="label">
                    Add a Photo{" "}
                    <span style={{ color: 'var(--color-text-4)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelectFromRef}
                  />
                  {imagePreview ? (
                    <div className="relative w-full rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                      <img src={imagePreview} alt="Job preview" className="w-full max-h-40 object-cover" />
                      <button
                        onClick={() => clearImage(fileRef)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full rounded-xl py-6 text-center transition-all duration-200"
                      style={{ border: '2px dashed var(--color-border)', background: 'transparent', color: 'var(--color-text-4)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#6366f1';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <Camera className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                      <div className="text-xs">Click to attach a photo (optional)</div>
                    </button>
                  )}
                </div>
              )}

              {/* Location */}
              <LocationInput value={location} onChange={setLocation} required />

              {/* Urgency */}
              <div>
                <label className="label">How urgent is this?</label>
                <div className="grid grid-cols-3 gap-3">
                  {URGENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setUrgency(opt.value);
                        if (opt.value !== "emergency") setIsEmergencyPremium(false);
                      }}
                      className="p-4 rounded-xl text-center transition-all duration-200"
                      style={{
                        border: urgency === opt.value ? '1.5px solid rgba(99,102,241,0.5)' : '1px solid var(--color-border)',
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

              {/* Emergency Fast Lane */}
              {urgency === "emergency" && (
                <EmergencyBanner
                  isActive={isEmergencyPremium}
                  fee={EMERGENCY_FEE}
                  onToggle={() => setIsEmergencyPremium((v) => !v)}
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={runAIAnalysis}
                disabled={!description.trim() || !(location.zipcode || (location.city && location.state) || location.address) || aiLoading}
                className="btn btn-primary flex-1 btn-lg"
              >
                {aiLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity=".25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI is analyzing…
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Analyze with AI
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setSkipAIAnalysis(true);
                  setStep(3);
                }}
                disabled={!description.trim() || !(location.zipcode || (location.city && location.state) || location.address)}
                className="btn btn-secondary"
                type="button"
                title="Skip AI analysis and go straight to job posting"
              >
                Skip →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 2 — AI DIAGNOSIS
        ═══════════════════════════════════════════════════════════════ */}
        {step === 2 && analysis && (
          <div className="space-y-5 animate-fade-up">

            {/* AI Diagnosis card */}
            <div
              className="card p-6 space-y-4"
              style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'var(--color-surface)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                >
                  <Brain className="w-4 h-4" style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>AI Diagnosis</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Powered by GPT-4</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{analysis.summary}</p>

              {sev && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: sev.bg, border: `1px solid ${sev.border}`, color: sev.text }}
                >
                  {sev.icon}
                  {analysis.severity.charAt(0).toUpperCase() + analysis.severity.slice(1)} Severity
                </div>
              )}

              {analysis.clarifyingQuestions && analysis.clarifyingQuestions.length > 0 && !skipQuestions && (
                <div
                  className="rounded-lg p-3 space-y-3"
                  style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>
                        📋 Answer these to narrow down the diagnosis (optional):
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-4)' }}>
                        These help contractors understand your issue better, but you can skip if you're in a hurry.
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {analysis.clarifyingQuestions.map((q, i) => (
                      <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--color-text-3)' }}>
                        <span style={{ color: '#fbbf24' }}>•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                  <textarea
                    placeholder="(Optional) Paste your answers to the questions above, or add any other details you think are important..."
                    value={answeredQuestions.join('\n')}
                    onChange={(e) => setAnsweredQuestions(e.target.value.split('\n').filter((a) => a.trim()))}
                    rows={2}
                    className="input resize-none text-xs"
                    style={{ fontSize: '12px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSkipQuestions(true)}
                    className="text-xs"
                    style={{ color: '#818cf8', textDecoration: 'underline' }}
                  >
                    Skip these questions, I'll add details in the description
                  </button>
                </div>
              )}

              {skipQuestions && (
                <div
                  className="rounded-lg p-3"
                  style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                >
                  <p className="text-xs" style={{ color: '#818cf8' }}>
                    ✓ Got it — skipped clarifying questions. Contractors will work with your description.
                  </p>
                </div>
              )}

              <div>
                <label className="label">
                  Detected Trade{" "}
                  <span style={{ color: 'var(--color-text-4)', fontWeight: 400 }}>(you can change this)</span>
                </label>
                <select
                  value={detectedTrade}
                  onChange={(e) => {
                    setDetectedTrade(e.target.value);
                    const hasLocation = location.zipcode || (location.city && location.state) || location.address;
                    if (hasLocation) fetchEstimate(e.target.value, location);
                    fetchParts(e.target.value, description.trim());
                  }}
                  className="input"
                >
                  {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Cost Estimate card */}
            <div className="card p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
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
                    onClick={() => fetchEstimate(detectedTrade, location)}
                    className="underline hover:opacity-70 transition-opacity"
                    style={{ color: '#818cf8' }}
                  >
                    Try again
                  </button>
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => <div key={i} className="skeleton rounded-xl p-3 h-16" />)}
                </div>
              )}
            </div>

            {/* Parts Finder card */}
            <div className="card p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  <ShoppingCart className="w-4 h-4" style={{ color: '#fbbf24' }} />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Parts You May Need</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Shop ahead to save time and money</p>
                </div>
                {partsLoading && (
                  <span className="text-xs animate-pulse" style={{ color: 'var(--color-text-4)' }}>Finding parts…</span>
                )}
              </div>

              {parts.length > 0 ? (
                <ul className="space-y-3">
                  {parts.map((part, i) => (
                    <li
                      key={i}
                      className="rounded-xl p-3"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{part.name}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{part.why}</div>
                        </div>
                        <span className="text-sm font-bold flex-shrink-0" style={{ color: '#34d399' }}>
                          {part.estimatedPrice}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        <a
                          href={`https://www.amazon.com/s?k=${encodeURIComponent(part.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                          style={{
                            background: 'rgba(251,191,36,0.12)',
                            border: '1px solid rgba(251,191,36,0.25)',
                            color: '#fbbf24',
                          }}
                        >
                          Find on Amazon <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href={`https://www.homedepot.com/s/${encodeURIComponent(part.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                          style={{
                            background: 'rgba(249,115,22,0.1)',
                            border: '1px solid rgba(249,115,22,0.22)',
                            color: '#fb923c',
                          }}
                        >
                          Find at Home Depot <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : partsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <div key={i} className="skeleton rounded-xl h-16" />)}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
                  No parts suggestions available.{" "}
                  <button
                    onClick={() => fetchParts(detectedTrade, description.trim())}
                    className="underline hover:opacity-70 transition-opacity"
                    style={{ color: '#818cf8' }}
                  >
                    Try again
                  </button>
                </p>
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
                    onClick={() => {
                      setUrgency(opt.value);
                      if (opt.value !== "emergency") setIsEmergencyPremium(false);
                    }}
                    className="p-4 rounded-xl text-center transition-all duration-200"
                    style={{
                      border: urgency === opt.value ? '1.5px solid rgba(99,102,241,0.5)' : '1px solid var(--color-border)',
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

              {urgency === "emergency" && (
                <div className="mt-4">
                  <EmergencyBanner
                    isActive={isEmergencyPremium}
                    fee={EMERGENCY_FEE}
                    onToggle={() => setIsEmergencyPremium((v) => !v)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(3)} className="btn btn-primary flex-[2]">
                Review &amp; Post <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 3 — REVIEW & POST
        ═══════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-up">

            {/* Warning if skipped analysis */}
            {skipAIAnalysis && (
              <div
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#3b82f6' }}>AI Analysis Skipped</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(59, 130, 246, 0.9)' }}>
                    You've skipped AI analysis. Make sure your description is detailed so contractors understand the issue clearly.
                  </p>
                </div>
              </div>
            )}

            {/* Review card */}
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>Review Your Job</h2>

              <div className="space-y-3">
                {(
                  [
                    { icon: <Brain className="w-4 h-4" />,     label: "Problem",  value: description },
                    { icon: <Briefcase className="w-4 h-4" />, label: "Trade",    value: detectedTrade || "General" },
                    { icon: <MapPin className="w-4 h-4" />,    label: "Location", value: location.zipcode ? `ZIP ${location.zipcode}` : location.city ? `${location.city}, ${location.state}` : location.address || "Not set" },
                    { icon: <Clock className="w-4 h-4" />,     label: "Urgency",  value: urgency.charAt(0).toUpperCase() + urgency.slice(1) },
                    ...(estimate
                      ? [{ icon: <DollarSign className="w-4 h-4" />, label: "Est. Cost", value: `$${estimate.price_low_usd.toLocaleString()} – $${estimate.price_high_usd.toLocaleString()}` }]
                      : []),
                  ] as { icon: React.ReactNode; label: string; value: string }[]
                ).map(({ icon, label, value }) => (
                  <div
                    key={label}
                    className="flex gap-3 py-3 rounded-lg px-3"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    <span style={{ color: 'var(--color-text-4)' }} className="mt-0.5 flex-shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</div>
                      <div
                        className="text-sm break-words"
                        style={{ color: label === "Est. Cost" ? '#34d399' : 'var(--color-text-2)' }}
                      >
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

            {/* Emergency premium callout */}
            {urgency === "emergency" && isEmergencyPremium && (
              <div
                className="rounded-xl px-4 py-4 flex items-center gap-3"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1.5px solid rgba(239,68,68,0.45)',
                  boxShadow: '0 0 16px rgba(239,68,68,0.15)',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>🚨</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: '#fca5a5' }}>Emergency Fast Lane — Enabled</p>
                  <p className="text-xs" style={{ color: 'rgba(252,165,165,0.8)' }}>
                    Contractors will respond within 2 hours. A <strong>+${EMERGENCY_FEE}</strong> surcharge applies.
                  </p>
                </div>
              </div>
            )}

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
                  ...(urgency === "emergency" && isEmergencyPremium
                    ? ["Emergency Fast Lane: a contractor will confirm within 2 hours"]
                    : []),
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs" style={{ color: '#818cf8' }}>
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(skipAIAnalysis ? 1 : 2)} className="btn btn-secondary flex-1">
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
                    Post Job &amp; Find Contractors
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
