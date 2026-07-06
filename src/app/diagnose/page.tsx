'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TRADES_FOR_PROMPT } from '@/lib/constants';
import {
  Brain, Camera, X, Loader2, AlertTriangle, CheckCircle,
  ArrowRight, Share2, Check, DollarSign, Wrench, Sparkles,
} from 'lucide-react';
import FinancingOption from '@/components/FinancingOption';
import TrustBar from '@/components/TrustBar';

type Diagnosis = {
  trade: string;
  severity: 'low' | 'moderate' | 'high' | 'emergency';
  summary: string;
  confidence?: string;
};

type Estimate = {
  price_low_usd: number;
  price_typical_usd: number;
  price_high_usd: number;
  why_this_range: string;
  scope_of_work?: string[];
  risk_factors?: string[];
  labor_hours_low?: number;
  labor_hours_high?: number;
  labor_rate_assumption?: string;
  materials_breakdown?: string;
  questions_to_confirm?: string[];
  diy_feasibility?: string;
};

const DIY_META: Record<string, { color: string; bg: string }> = {
  'Easy':            { color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
  'Moderate':        { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
  'Difficult':       { color: '#fb923c', bg: 'rgba(249,115,22,0.1)' },
  'Not recommended': { color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
};

const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low:       { label: 'Minor',     color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
  moderate:  { label: 'Moderate',  color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
  high:      { label: 'Serious',   color: '#fb923c', bg: 'rgba(249,115,22,0.1)' },
  emergency: { label: 'Emergency', color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
};

export default function DiagnosePage() {
  const [description, setDescription] = useState('');
  const [zip, setZip] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function runDiagnosis() {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    setDiagnosis(null);
    setEstimate(null);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are diagnosing a home repair problem. The customer describes: "${description.trim()}".

Respond with ONLY a JSON object:
{
  "trade": "<best matching trade from: ${TRADES_FOR_PROMPT}>",
  "severity": "<low|moderate|high|emergency>",
  "summary": "<2-3 sentence plain-English diagnosis: what's likely wrong, what causes it, what happens if ignored>",
  "confidence": "<high|medium|low>"
}`,
          imageUrl: imagePreview,
          mode: 'homeowner',
        }),
      });
      if (res.status === 429) throw new Error('Too many requests — give it a minute and try again.');
      const data = await res.json();
      const m = ((data.reply as string) ?? '').match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Could not analyze that — try adding more detail.');
      const parsed = JSON.parse(m[0]) as Diagnosis;
      setDiagnosis(parsed);

      // Top-of-funnel event (fire-and-forget)
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'diagnosis_run', meta: { trade: parsed.trade, severity: parsed.severity, hadPhoto: !!imagePreview, hadZip: !!zip.trim() } }),
      }).catch(() => {});

      // Price estimate (best-effort, needs a location)
      if (zip.trim()) {
        setEstimateLoading(true);
        fetch('/api/estimate-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: description.trim(),
            trade: parsed.trade,
            location: { zipcode: zip.trim() },
            urgency: parsed.severity === 'emergency' ? 'emergency' : 'flexible',
          }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.estimate && setEstimate(d.estimate))
          .catch(() => {})
          .finally(() => setEstimateLoading(false));
      }
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    if (!diagnosis) return;
    const text = `🔧 AI Diagnosis: ${diagnosis.summary}${estimate ? ` Estimated cost: $${estimate.price_low_usd}–$${estimate.price_high_usd}.` : ''} — via RepairAI Pro`;
    if (navigator.share) {
      navigator.share({ title: 'My repair diagnosis', text, url: window.location.origin + '/diagnose' }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sev = diagnosis ? (SEVERITY_META[diagnosis.severity] ?? SEVERITY_META.moderate) : null;

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-xl mx-auto px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
          >
            <Sparkles className="w-3 h-3" /> Free · No sign-up · 10 seconds
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            What&apos;s broken?
          </h1>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--color-text-3)' }}>
            Describe it (or snap a photo) and AI tells you what&apos;s wrong, how serious it is,
            and what it should cost in your area.
          </p>
        </div>

        {/* Input card */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={'e.g. "Water dripping from the ceiling under my upstairs bathroom"'}
            rows={4}
            className="input resize-none"
          />

          <div className="flex gap-3 items-center flex-wrap">
            {/* Photo */}
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Problem" className="w-16 h-16 object-cover rounded-xl" style={{ border: '1px solid var(--color-border)' }} />
                <button
                  onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                <Camera className="w-3.5 h-3.5" /> Add photo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />

            {/* Zip for price */}
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="ZIP (for price)"
              inputMode="numeric"
              className="input"
              style={{ width: '130px' }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={runDiagnosis}
            disabled={loading || !description.trim()}
            className="btn btn-primary btn-full"
            style={{ opacity: !description.trim() ? 0.75 : 1, cursor: !description.trim() ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Brain className="w-4 h-4" /> Diagnose It Free</>
            )}
          </button>
        </div>

        {/* Result */}
        <AnimatePresence>
          {diagnosis && sev && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl overflow-hidden"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {/* Diagnosis header */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                    >
                      <Wrench className="w-3 h-3" /> {diagnosis.trade}
                    </span>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: sev.bg, color: sev.color }}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <button onClick={handleShare} className="btn btn-ghost btn-sm">
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Share2 className="w-3.5 h-3.5" /> Share</>}
                  </button>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
                  {diagnosis.summary}
                </p>
              </div>

              {/* Price band */}
              {(estimate || estimateLoading) && (
                <div className="px-5 pb-5">
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
                  >
                    {estimateLoading ? (
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-4)' }}>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating local price range…
                      </div>
                    ) : estimate && (
                      <>
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#34d399' }}>
                            Fair price in {zip}
                          </span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                          ${estimate.price_low_usd}–${estimate.price_high_usd}
                          <span className="text-sm font-medium ml-2" style={{ color: 'var(--color-text-4)' }}>
                            typical ${estimate.price_typical_usd}
                          </span>
                        </p>
                        {estimate.why_this_range && (
                          <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-4)' }}>
                            {estimate.why_this_range}
                          </p>
                        )}
                        {(estimate.labor_hours_low != null || estimate.materials_breakdown) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs" style={{ color: 'var(--color-text-3)' }}>
                            {estimate.labor_hours_low != null && estimate.labor_hours_high != null && (
                              <span>
                                <strong style={{ color: 'var(--color-text-2)' }}>Labor:</strong>{' '}
                                {estimate.labor_hours_low === estimate.labor_hours_high
                                  ? `~${estimate.labor_hours_low}h`
                                  : `${estimate.labor_hours_low}–${estimate.labor_hours_high}h`}
                                {estimate.labor_rate_assumption ? ` at ${estimate.labor_rate_assumption}` : ''}
                              </span>
                            )}
                            {estimate.materials_breakdown && (
                              <span>
                                <strong style={{ color: 'var(--color-text-2)' }}>Materials:</strong> {estimate.materials_breakdown}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-2">
                          <FinancingOption total={estimate.price_typical_usd} variant="inline" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Full job breakdown — the "know the job before the contractor does" section */}
              {estimate && (
                <div className="px-5 pb-5 space-y-4">
                  {estimate.diy_feasibility && DIY_META[estimate.diy_feasibility] && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-3)' }}>DIY difficulty:</span>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: DIY_META[estimate.diy_feasibility].bg, color: DIY_META[estimate.diy_feasibility].color }}
                      >
                        {estimate.diy_feasibility}
                      </span>
                    </div>
                  )}

                  {Array.isArray(estimate.scope_of_work) && estimate.scope_of_work.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-3)' }}>
                        What the job involves
                      </p>
                      <ol className="space-y-1.5">
                        {estimate.scope_of_work.map((step, i) => (
                          <li key={i} className="flex gap-2.5 text-xs leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
                            <span
                              className="flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                            >
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {Array.isArray(estimate.questions_to_confirm) && estimate.questions_to_confirm.length > 0 && (
                    <div
                      className="rounded-xl p-3.5"
                      style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#818cf8' }}>
                        A contractor will ask you these — know your answers
                      </p>
                      <ul className="space-y-1.5">
                        {estimate.questions_to_confirm.map((q, i) => (
                          <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
                            <span style={{ color: '#818cf8' }}>•</span> {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(estimate.risk_factors) && estimate.risk_factors.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-3)' }}>
                        What could raise the price
                      </p>
                      <ul className="space-y-1.5">
                        {estimate.risk_factors.map((r, i) => (
                          <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-4)' }}>
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} /> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="p-5 pt-0">
                <Link
                  href={`/jobs/new?desc=${encodeURIComponent(description.trim())}`}
                  className="btn btn-primary btn-full"
                  onClick={() => {
                    // Photo is a base64 data URL — too large for a URL param, so
                    // hand it off via sessionStorage; /jobs/new consumes it once on mount.
                    if (imagePreview) {
                      try { sessionStorage.setItem('diagnose_photo', imagePreview); } catch {}
                    }
                  }}
                >
                  <CheckCircle className="w-4 h-4" /> Get matched with a verified pro
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="mt-3">
                  <TrustBar compact />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
