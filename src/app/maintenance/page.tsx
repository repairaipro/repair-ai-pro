'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { Plus, Shield, Loader2, ArrowLeft, Calendar } from 'lucide-react';
import MaintenancePlanCard from '@/components/MaintenancePlanCard';

type Plan = {
  id: string;
  title: string;
  description: string;
  trade: string;
  frequency: string;
  frequencyLabel: string;
  pricePerService: number;
  status: 'active' | 'paused' | 'cancelled';
  nextServiceDate: string | null;
  lastServiceDate: string | null;
  jobsCreated: number;
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const authLoading = user === undefined;
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((t: string) => {
      setAuthToken(t);
      fetchPlans(t);
    });
  }, [user]);

  async function fetchPlans(token: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance-plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPlans(data.plans || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const activePlans = plans.filter((p) => p.status === 'active');
  const totalMonthly = activePlans.reduce((s, p) => {
    const multiplier = p.frequency === 'monthly' ? 1 : p.frequency === 'quarterly' ? 1/3 : p.frequency === 'semi_annual' ? 1/6 : 1/12;
    return s + p.pricePerService * multiplier;
  }, 0);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <Loader2 size={32} className="animate-spin" color="#6366f1" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9ca3af', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Maintenance Plans
              </h1>
              <p style={{ color: '#9ca3af', fontSize: 14, margin: '4px 0 0' }}>
                Scheduled home maintenance — never miss a service
              </p>
            </div>
            <Link
              href="/maintenance/new"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
            >
              <Plus size={16} /> Add Plan
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px' }}>
        {/* Summary */}
        {activePlans.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Active Plans', value: activePlans.length.toString(), color: '#10b981' },
              { label: 'Monthly Cost', value: `$${totalMonthly.toFixed(0)}`, color: '#6366f1' },
              { label: 'Services Done', value: plans.reduce((s, p) => s + p.jobsCreated, 0).toString(), color: '#f59e0b' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 20px' }}
              >
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{stat.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Plans list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="animate-spin" color="#6366f1" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#6b7280', fontSize: 14 }}>Loading your plans…</p>
          </div>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Shield size={32} color="#6366f1" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>No maintenance plans yet</h2>
            <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Set up recurring visits for HVAC, plumbing, electrical, and more. Your home gets serviced automatically — you just approve the visit.
            </p>

            {/* Feature callouts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, maxWidth: 560, margin: '0 auto 28px', textAlign: 'left' }}>
              {[
                { icon: '🔄', title: 'Auto-scheduled', desc: 'Jobs created automatically on your cycle' },
                { icon: '👷', title: 'Preferred contractor', desc: 'Lock in a trusted pro for every visit' },
                { icon: '💳', title: 'Pay per service', desc: 'Billed only when a service is completed' },
              ].map((f) => (
                <div key={f.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <Link
              href="/maintenance/new"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700 }}
            >
              <Plus size={17} /> Create Your First Plan
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Active first, then paused, then cancelled */}
            {['active', 'paused', 'cancelled'].map((status) => {
              const filtered = plans.filter((p) => p.status === status);
              if (!filtered.length) return null;
              return (
                <div key={status}>
                  {status !== 'active' && (
                    <div style={{ fontSize: 11, color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 }}>
                      {status === 'paused' ? 'Paused' : 'Cancelled'}
                    </div>
                  )}
                  {filtered.map((plan) => (
                    <MaintenancePlanCard
                      key={plan.id}
                      plan={plan}
                      authToken={authToken}
                      onUpdate={() => fetchPlans(authToken)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
