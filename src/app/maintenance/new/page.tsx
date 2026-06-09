'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Calendar, DollarSign, Wrench, MapPin } from 'lucide-react';

const TRADES = [
  { value: 'hvac',        label: 'HVAC',             icon: '❄️',  desc: 'Heating & cooling systems' },
  { value: 'plumbing',    label: 'Plumbing',          icon: '🔧',  desc: 'Pipes, drains, water heater' },
  { value: 'electrical',  label: 'Electrical',        icon: '⚡',  desc: 'Wiring, outlets, panel' },
  { value: 'roofing',     label: 'Roofing',           icon: '🏠',  desc: 'Roof inspection & repair' },
  { value: 'landscaping', label: 'Landscaping',       icon: '🌿',  desc: 'Lawn, garden, irrigation' },
  { value: 'cleaning',    label: 'Home Cleaning',     icon: '🧹',  desc: 'Deep cleaning & maintenance' },
  { value: 'appliance',   label: 'Appliances',        icon: '🍽️',  desc: 'Washer, dryer, dishwasher' },
  { value: 'general',     label: 'General Handyman',  icon: '🔨',  desc: 'Misc repairs & upkeep' },
];

const FREQUENCIES = [
  { value: 'monthly',     label: 'Monthly',        desc: 'Every month',        savings: '' },
  { value: 'quarterly',   label: 'Quarterly',      desc: 'Every 3 months',     savings: 'Most popular' },
  { value: 'semi_annual', label: 'Every 6 Months', desc: 'Twice a year',       savings: '' },
  { value: 'annual',      label: 'Annual',         desc: 'Once a year',        savings: '' },
];

const SUGGESTED_PRICES: Record<string, Record<string, number>> = {
  hvac:        { monthly: 89, quarterly: 149, semi_annual: 199, annual: 299 },
  plumbing:    { monthly: 99, quarterly: 159, semi_annual: 249, annual: 399 },
  electrical:  { monthly: 99, quarterly: 169, semi_annual: 269, annual: 449 },
  roofing:     { monthly: 129, quarterly: 199, semi_annual: 299, annual: 499 },
  landscaping: { monthly: 149, quarterly: 299, semi_annual: 499, annual: 799 },
  cleaning:    { monthly: 199, quarterly: 349, semi_annual: 549, annual: 899 },
  appliance:   { monthly: 79, quarterly: 129, semi_annual: 199, annual: 299 },
  general:     { monthly: 89, quarterly: 149, semi_annual: 249, annual: 399 },
};

type FormData = {
  trade: string;
  frequency: string;
  pricePerService: number;
  title: string;
  description: string;
  address: string;
  startDate: string;
};

export default function NewMaintenancePlanPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    trade: '',
    frequency: 'quarterly',
    pricePerService: 0,
    title: '',
    description: '',
    address: '',
    startDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(field: keyof FormData, value: string | number) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-suggest price when trade + frequency selected
      if ((field === 'trade' || field === 'frequency') && updated.trade && updated.frequency) {
        const suggested = SUGGESTED_PRICES[updated.trade]?.[updated.frequency] || 0;
        if (updated.pricePerService === 0 || updated.pricePerService === prev.pricePerService) {
          updated.pricePerService = suggested;
        }
      }

      // Auto-generate title when trade is selected
      if (field === 'trade' && value) {
        const tradeLabel = TRADES.find((t) => t.value === value)?.label || value;
        updated.title = `${tradeLabel} Maintenance Plan`;
      }

      return updated;
    });
  }

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/maintenance-plans', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      router.push('/maintenance');
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  const steps = [
    { title: 'Service Type', icon: Wrench },
    { title: 'Schedule & Price', icon: Calendar },
    { title: 'Details', icon: MapPin },
    { title: 'Confirm', icon: Check },
  ];

  const canAdvance = [
    !!form.trade,
    !!form.frequency && form.pricePerService >= 25,
    !!form.address.trim() && !!form.title.trim(),
    true,
  ][step];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Link href="/maintenance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9ca3af', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
            <ArrowLeft size={16} /> My Plans
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Create Maintenance Plan</h1>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 24px' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 0 }}>
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.title} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: done ? '#6366f1' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                    border: active ? '2px solid #6366f1' : done ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done ? <Check size={15} color="#fff" /> : <s.icon size={15} color={active ? '#a5b4fc' : '#4b5563'} />}
                  </div>
                  <span style={{ fontSize: 10, color: active ? '#a5b4fc' : done ? '#6b7280' : '#374151', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap' }}>
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: done ? '#6366f1' : 'rgba(255,255,255,0.08)', margin: '0 6px', marginBottom: 16 }} />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0 — Service type */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>What type of service?</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Choose the category for this maintenance plan.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {TRADES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => update('trade', t.value)}
                    style={{
                      padding: '14px 16px', textAlign: 'left',
                      background: form.trade === t.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: form.trade === t.value ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: form.trade === t.value ? '#a5b4fc' : '#e5e7eb', marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1 — Frequency & Price */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>How often & how much?</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Pick a schedule and set the per-visit price.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => update('frequency', f.value)}
                    style={{
                      padding: '14px 16px', textAlign: 'left',
                      background: form.frequency === f.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: form.frequency === f.value ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14, cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: form.frequency === f.value ? '#a5b4fc' : '#e5e7eb', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{f.desc}</div>
                    {f.savings && (
                      <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 20, display: 'inline-block' }}>
                        {f.savings}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 8 }}>
                  Price per visit (USD)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24, color: '#6b7280' }}>$</span>
                  <input
                    type="number"
                    value={form.pricePerService || ''}
                    onChange={(e) => update('pricePerService', Number(e.target.value))}
                    placeholder="149"
                    min={25}
                    max={10000}
                    style={{ flex: 1, fontSize: 28, fontWeight: 700, padding: '8px 0', background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
                  />
                </div>
                {form.trade && form.frequency && (
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                    Suggested for {TRADES.find((t) => t.value === form.trade)?.label}: ${SUGGESTED_PRICES[form.trade]?.[form.frequency] || 0}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Plan details</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Name this plan and tell us where to send the contractor.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 8 }}>Plan Name</label>
                  <input
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="e.g. HVAC Quarterly Checkup"
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 8 }}>Service Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="123 Main St, City, State 12345"
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 8 }}>Description (optional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="Any special notes for the contractor (access codes, pet info, specific areas to check)…"
                    rows={3}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 8 }}>
                    First Service Date <span style={{ color: '#4b5563', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                    min={new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Confirm */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Review & confirm</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Your maintenance plan will start after your first payment method is set up.</p>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{TRADES.find((t) => t.value === form.trade)?.icon}</div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{form.title}</h3>
                <p style={{ color: '#9ca3af', margin: '0 0 20px', fontSize: 14 }}>{form.description || form.address}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Service', value: TRADES.find((t) => t.value === form.trade)?.label },
                    { label: 'Frequency', value: FREQUENCIES.find((f) => f.value === form.frequency)?.label },
                    { label: 'Price per visit', value: `$${form.pricePerService}` },
                    { label: 'Address', value: form.address },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: '#6ee7b7', margin: 0, lineHeight: 1.6 }}>
                  ✓ You'll be billed ${form.pricePerService} {FREQUENCIES.find((f) => f.value === form.frequency)?.desc?.toLowerCase()}.
                  Cancel anytime. A job is automatically created for each scheduled visit.
                </p>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              style={{ flex: 1, padding: '13px', background: canAdvance ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, color: canAdvance ? '#fff' : '#4b5563', fontSize: 15, fontWeight: 700, cursor: canAdvance ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <><Check size={16} /> Create Plan</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
