'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Check, ShieldCheck, Clock, ArrowLeft } from 'lucide-react';
import { getFinancingEstimate } from '@/lib/financing';

export default function FinancingPage() {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const a = Number(new URLSearchParams(window.location.search).get('amount') ?? 0);
    if (a > 0) setAmount(a);
  }, []);

  const est = amount > 0 ? getFinancingEstimate(amount) : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">

        <Link href="/diagnose" className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-4)' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}
          >
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Pay for your repair over time
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
            Spread the cost of bigger jobs into affordable monthly payments — so a sudden repair
            doesn&apos;t mean a sudden bill.
          </p>
        </div>

        {est && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <p className="text-xs uppercase tracking-wide font-bold mb-1" style={{ color: '#34d399' }}>
              ${est.total.toLocaleString()} job
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              from ${est.monthlyLow}<span className="text-base font-medium" style={{ color: 'var(--color-text-4)' }}>/mo</span>
            </p>
            <div className="mt-3 space-y-1">
              {est.plans.map((p) => (
                <div key={p.months} className="flex items-center justify-between text-xs px-2">
                  <span style={{ color: 'var(--color-text-4)' }}>{p.months} months</span>
                  <span className="font-semibold" style={{ color: 'var(--color-text-2)' }}>${p.monthly}/mo</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {[
            { icon: <Clock className="w-4 h-4" />, t: 'Apply in minutes', d: 'A quick prequalification with no impact to your credit score.' },
            { icon: <Check className="w-4 h-4" />, t: 'Choose your term', d: 'Pick the monthly payment that fits your budget.' },
            { icon: <ShieldCheck className="w-4 h-4" />, t: 'Pay the pro directly', d: 'Funds go straight to your verified contractor through RepairAI.' },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-3 rounded-xl p-3.5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{f.t}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{f.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Coming-soon notice — swap for the real lender flow when wired */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Financing is launching soon
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-4)' }}>
            We&apos;re partnering with a lender to offer instant prequalification. For now, post your
            job and your pro can discuss payment options directly.
          </p>
          <Link href="/jobs/new" className="btn btn-primary btn-sm">
            Post your job
          </Link>
        </div>

        <p className="text-[10px] text-center" style={{ color: 'var(--color-text-4)' }}>
          Payment estimates are illustrative ({est ? (est.apr * 100).toFixed(1) : '9.9'}% APR representative).
          Actual rates and terms are determined by the lender at application and are subject to approval.
        </p>
      </div>
    </div>
  );
}
