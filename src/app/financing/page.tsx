'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard, Check, ShieldCheck, Clock, ArrowLeft, Loader2,
  ChevronDown, ChevronUp, BadgeCheck,
} from 'lucide-react';
import { getFinancingEstimate } from '@/lib/financing';

type Step = 'calculator' | 'form' | 'success';

export default function FinancingPage() {
  const [amount, setAmount]           = useState(0);
  const [inputAmount, setInputAmount] = useState('');
  const [step, setStep]               = useState<Step>('calculator');
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [redirecting, setRedirecting] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [jobType, setJobType]     = useState('');

  useEffect(() => {
    const a = Number(new URLSearchParams(window.location.search).get('amount') ?? 0);
    if (a > 0) { setAmount(a); setInputAmount(String(a)); }
  }, []);

  const est = amount >= 500 ? getFinancingEstimate(amount) : null;

  function handleAmountChange(v: string) {
    setInputAmount(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 500) setAmount(n);
    else if (v === '') setAmount(0);
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in all required fields.'); return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res  = await fetch('/api/financing/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ firstName, lastName, email, phone, amount, jobType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');

      if (data.redirect) {
        setRedirecting(true);
        window.location.href = data.redirect;
      } else {
        setSuccessMsg(data.message ?? 'Application received!');
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">

        <Link
          href={step === 'form' ? '#' : '/diagnose'}
          onClick={step === 'form' ? (e) => { e.preventDefault(); setStep('calculator'); } : undefined}
          className="inline-flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--color-text-4)' }}>
          <ArrowLeft className="w-4 h-4" />
          {step === 'form' ? 'Back to calculator' : 'Back'}
        </Link>

        {/* ── STEP 1: Calculator ── */}
        {step === 'calculator' && (
          <>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Finance your repair
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
                Spread the cost into affordable monthly payments. Pre-qualify in 60 seconds — no credit impact.
              </p>
            </div>

            {/* Amount input */}
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--color-text-3)' }}>
                  How much do you need to finance?
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold" style={{ color: 'var(--color-text-3)' }}>$</span>
                  <input
                    type="number"
                    min="500"
                    placeholder="e.g. 3500"
                    value={inputAmount}
                    onChange={e => handleAmountChange(e.target.value)}
                    className="input pl-7"
                    style={{ fontSize: 18, fontWeight: 700 }}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-4)' }}>Minimum $500</p>
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-2 flex-wrap">
                {[1000, 2500, 5000, 10000].map(v => (
                  <button key={v} onClick={() => { setAmount(v); setInputAmount(String(v)); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={amount === v
                      ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)' }
                      : { background: 'var(--color-surface-2)', color: 'var(--color-text-4)', border: '1px solid var(--color-border)' }}>
                    ${v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment plans */}
            {est ? (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="p-5 text-center">
                  <p className="text-xs uppercase tracking-wide font-bold mb-1" style={{ color: '#34d399' }}>
                    ${amount.toLocaleString()} financed
                  </p>
                  <p className="text-4xl font-black mb-1" style={{ color: 'var(--color-text)' }}>
                    ${est.monthlyLow}
                    <span className="text-base font-medium" style={{ color: 'var(--color-text-4)' }}>/mo</span>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                    Lowest monthly payment — {est.termMonths}-month term
                  </p>
                </div>

                <div className="px-5 pb-5 space-y-2">
                  {(showAllPlans ? est.plans : est.plans.slice(0, 3)).map((p, i) => (
                    <div key={p.months}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm"
                      style={{
                        background: i === 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                        border: i === 0 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      }}>
                      <span style={{ color: 'var(--color-text-3)' }}>{p.months} months</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                          ${(p.monthly * p.months).toLocaleString()} total
                        </span>
                        <span className="font-bold" style={{ color: i === 0 ? '#34d399' : 'var(--color-text)' }}>
                          ${p.monthly}/mo
                        </span>
                      </div>
                    </div>
                  ))}
                  {est.plans.length > 3 && (
                    <button onClick={() => setShowAllPlans(p => !p)}
                      className="w-full text-xs flex items-center justify-center gap-1 pt-1"
                      style={{ color: 'var(--color-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showAllPlans
                        ? <><ChevronUp className="w-3 h-3" /> Show fewer</>
                        : <><ChevronDown className="w-3 h-3" /> See all plans</>}
                    </button>
                  )}
                </div>
              </div>
            ) : amount > 0 && amount < 500 ? (
              <div className="rounded-xl p-4 text-center text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-4)' }}>
                Financing is available for jobs of $500 or more.
              </div>
            ) : null}

            {/* How it works */}
            <div className="space-y-3">
              {[
                { icon: <Clock className="w-4 h-4" />, t: 'Pre-qualify in 60 seconds', d: 'Soft credit check only — no impact to your score.' },
                { icon: <Check className="w-4 h-4" />, t: 'Pick your term', d: 'Choose 12, 24, 36, or 60 months — whatever fits your budget.' },
                { icon: <ShieldCheck className="w-4 h-4" />, t: 'Contractor gets paid', d: 'Funds go directly to your verified pro through RepairAI escrow.' },
              ].map(f => (
                <div key={f.t} className="flex items-start gap-3 rounded-xl p-3.5"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>{f.icon}</div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{f.t}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{f.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => est && setStep('form')}
              disabled={!est}
              className="btn btn-full"
              style={{
                opacity: est ? 1 : 0.4,
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 0',
                border: 'none', borderRadius: 14, cursor: est ? 'pointer' : 'not-allowed',
                boxShadow: est ? '0 8px 24px -8px rgba(16,185,129,0.5)' : 'none',
              }}>
              Pre-qualify — No credit impact →
            </button>

            <p className="text-[10px] text-center" style={{ color: 'var(--color-text-4)' }}>
              {est ? (est.apr * 100).toFixed(1) : '9.9'}% APR representative. Actual rates determined by lender at
              application, subject to credit approval. Not available in all states.
            </p>
          </>
        )}

        {/* ── STEP 2: Application form ── */}
        {step === 'form' && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                Pre-qualify for financing
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
                60 seconds · No credit impact · ${amount.toLocaleString()} requested
              </p>
            </div>

            {est && (
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="text-sm" style={{ color: 'var(--color-text-3)' }}>From</span>
                <span className="text-xl font-black" style={{ color: '#34d399' }}>${est.monthlyLow}/mo</span>
                <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>{est.termMonths}-mo term</span>
              </div>
            )}

            <form onSubmit={handleApply} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>First name *</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" required className="input" />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>Last name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className="input" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="jane@email.com" required className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>Mobile phone *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000" required className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>What type of repair?</label>
                <select value={jobType} onChange={e => setJobType(e.target.value)} className="input">
                  <option value="">Select a trade (optional)</option>
                  {['Plumbing','Electrical','HVAC','Roofing','Carpentry','Painting','Appliance Repair','General Repair'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-xs rounded-lg px-3 py-2"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                  ⚠ {error}
                </p>
              )}

              <button type="submit" disabled={submitting || redirecting}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  boxShadow: '0 8px 24px -8px rgba(16,185,129,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: submitting || redirecting ? 0.7 : 1,
                }}>
                {submitting || redirecting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{redirecting ? 'Redirecting to lender…' : 'Submitting…'}</>
                  : 'Submit pre-qualification →'}
              </button>

              <p className="text-[10px] text-center" style={{ color: 'var(--color-text-4)' }}>
                By submitting you agree to a soft credit inquiry which will not affect your score. Approval is not guaranteed.
              </p>
            </form>
          </>
        )}

        {/* ── STEP 3: Success ── */}
        {step === 'success' && (
          <div className="text-center space-y-6 py-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.4)' }}>
              <BadgeCheck className="w-8 h-8" style={{ color: '#4ade80' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Application received!</h2>
              <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--color-text-3)' }}>
                {successMsg}
              </p>
            </div>
            <div className="rounded-xl p-4 text-left space-y-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-3)' }}>What happens next</p>
              {[
                'Our financing team reviews your application',
                'We reach out within 1 business day',
                'Once approved, post your job and we\'ll fund your pro directly',
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-4)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{i + 1}</span>
                  {s}
                </div>
              ))}
            </div>
            <Link href="/jobs/new" className="btn btn-primary btn-full" style={{ display: 'flex' }}>
              Post your job in the meantime →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
