'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Loader2, CheckCircle, Clock,
  AlertTriangle, XCircle, Wrench, Shield,
} from 'lucide-react';

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
  address: string;
  startDate: string | null;
  createdAt: string | null;
};

type Job = {
  id: string;
  status: string;
  description: string;
  createdAt: string | null;
};

const JOB_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  triaged:   { label: 'Scheduled',  color: '#6366f1', icon: Clock },
  accepted:  { label: 'Accepted',   color: '#3b82f6', icon: Clock },
  in_progress: { label: 'In Progress', color: '#f59e0b', icon: Wrench },
  completed: { label: 'Completed',  color: '#10b981', icon: CheckCircle },
  confirmed: { label: 'Confirmed',  color: '#10b981', icon: CheckCircle },
  cancelled: { label: 'Cancelled',  color: '#6b7280', icon: XCircle },
  disputed:  { label: 'Disputed',   color: '#ef4444', icon: AlertTriangle },
};

const TRADE_ICONS: Record<string, string> = {
  plumbing: '🔧', electrical: '⚡', hvac: '❄️', roofing: '🏠',
  appliance: '🍽️', landscaping: '🌿', cleaning: '🧹', general: '🔨',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function MaintenancePlanDetailPage() {
  const { user } = useAuth();
  const authLoading = user === undefined;
  const router = useRouter();
  const params = useParams();
  const planId = params?.planId as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !planId) return;
    user.getIdToken().then((token: string) => fetchPlan(token));
  }, [user, planId]);

  async function fetchPlan(token: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/maintenance-plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPlan(data.plan);
      setJobs(data.jobs || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <Loader2 size={32} className="animate-spin" color="#6366f1" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f87171', marginBottom: 16 }}>{error || 'Plan not found'}</p>
          <Link href="/maintenance" style={{ color: '#6366f1', textDecoration: 'none' }}>← Back to Plans</Link>
        </div>
      </div>
    );
  }

  const tradeIcon = TRADE_ICONS[plan.trade?.toLowerCase()] || '🔨';
  const statusColors = { active: '#10b981', paused: '#f59e0b', cancelled: '#6b7280' };
  const statusColor = statusColors[plan.status] || '#6b7280';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link href="/maintenance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9ca3af', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
            <ArrowLeft size={16} /> Maintenance Plans
          </Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ fontSize: 40, lineHeight: 1, flexShrink: 0 }}>{tradeIcon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{plan.title}</h1>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: `${statusColor}20`, color: statusColor, fontWeight: 700,
                  textTransform: 'capitalize',
                }}>
                  {plan.status}
                </span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>{plan.description || plan.frequencyLabel}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>${plan.pricePerService}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{plan.frequencyLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
        {/* Service dates + address */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Next Service', value: formatDate(plan.nextServiceDate), icon: Calendar, color: '#6366f1' },
            { label: 'Last Service', value: formatDate(plan.lastServiceDate), icon: Calendar, color: '#10b981' },
            { label: 'Services Completed', value: plan.jobsCreated.toString(), icon: Shield, color: '#f59e0b' },
          ].map((item) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <item.icon size={14} color={item.color} />
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{item.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Address */}
        {plan.address && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 18px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Service Address</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e5e7eb' }}>{plan.address}</div>
          </div>
        )}

        {/* Job History */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', color: '#e5e7eb' }}>
            Service History
          </h2>

          {jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
              <Calendar size={32} color="#4b5563" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                No services completed yet. Your first visit will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {jobs.map((job, i) => {
                const cfg = JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.triaged;
                const StatusIcon = cfg.icon;
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <StatusIcon size={18} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', marginBottom: 2 }}>{job.description}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{formatDate(job.createdAt)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${cfg.color}18`, color: cfg.color, fontWeight: 600 }}>
                        {cfg.label}
                      </span>
                      <Link
                        href={`/jobs/${job.id}`}
                        style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none' }}
                      >
                        View job →
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
