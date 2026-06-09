'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import {
  FileText, DollarSign, Clock, CheckCircle, AlertCircle,
  ArrowLeft, ExternalLink, Send, ChevronRight, Loader2
} from 'lucide-react';

type InvoiceItem = {
  id: string;
  jobId: string;
  jobDescription: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  total: number;
  subtotal: number;
  createdAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
};

type Summary = {
  total: number;
  paid: number;
  pending: number;
  draft: number;
};

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  sent:      { label: 'Sent',      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  paid:      { label: 'Paid',      color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const authLoading = user === undefined;
  const router = useRouter();

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, paid: 0, pending: 0, draft: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchInvoices();
  }, [user]);

  async function fetchInvoices() {
    setLoading(true);
    setError('');
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/invoices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setInvoices(data.invoices || []);
      setSummary(data.summary || { total: 0, paid: 0, pending: 0, draft: 0 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(invoice: InvoiceItem) {
    setActionLoading(invoice.id);
    try {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/jobs/${invoice.jobId}/invoice`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, action: 'send' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await fetchInvoices();
    } catch (e: any) {
      alert('Failed to send: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkPaid(invoice: InvoiceItem) {
    if (!confirm('Mark this invoice as paid?')) return;
    setActionLoading(invoice.id);
    try {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/jobs/${invoice.jobId}/invoice`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, action: 'mark_paid' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await fetchInvoices();
    } catch (e: any) {
      alert('Failed to update: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <Loader2 size={32} className="animate-spin" color="#6366f1" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9ca3af', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Invoice Manager
              </h1>
              <p style={{ color: '#9ca3af', fontSize: 14, margin: '4px 0 0' }}>Track your earnings and manage invoices</p>
            </div>
            <FileText size={32} color="#6366f1" />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 0' }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Invoiced', value: formatCurrency(summary.total), icon: DollarSign, color: '#6366f1' },
            { label: 'Paid', value: formatCurrency(summary.paid), icon: CheckCircle, color: '#10b981' },
            { label: 'Pending', value: formatCurrency(summary.pending), icon: Clock, color: '#f59e0b' },
            { label: 'Drafts', value: summary.draft.toString(), icon: AlertCircle, color: '#6b7280' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>{card.label}</span>
                <card.icon size={18} color={card.color} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Invoice List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="animate-spin" color="#6366f1" style={{ margin: '0 auto' }} />
            <p style={{ color: '#9ca3af', marginTop: 16 }}>Loading invoices…</p>
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 24, textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <FileText size={48} color="#374151" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: '#6b7280', fontWeight: 600, marginBottom: 8 }}>No invoices yet</h3>
            <p style={{ color: '#4b5563', fontSize: 14 }}>Complete a job and generate your first AI-powered invoice from the job detail page.</p>
            <Link href="/my-jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20, padding: '10px 20px', background: '#6366f1', borderRadius: 10, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              View My Jobs <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {invoices.map((inv, i) => {
              const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
              const isActioning = actionLoading === inv.id;
              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{inv.invoiceNumber}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: statusCfg.color, background: statusCfg.bg }}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>{inv.jobDescription || 'Repair Job'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{formatCurrency(inv.total)}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {inv.status === 'paid' ? `Paid ${formatDate(inv.paidAt)}` :
                         inv.status === 'sent' ? `Sent ${formatDate(inv.sentAt)}` :
                         `Created ${formatDate(inv.createdAt)}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link
                      href={`/jobs/${inv.jobId}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, color: '#d1d5db', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
                    >
                      <ExternalLink size={14} /> View Job
                    </Link>

                    {inv.status !== 'draft' && (
                      <Link
                        href={`/pay/${inv.id}`}
                        target="_blank"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, color: '#d1d5db', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
                      >
                        <ExternalLink size={14} /> Payment Page
                      </Link>
                    )}

                    {inv.status === 'draft' && (
                      <button
                        onClick={() => handleSend(inv)}
                        disabled={isActioning}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#6366f1', borderRadius: 8, color: '#fff', border: 'none', cursor: isActioning ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: isActioning ? 0.6 : 1 }}
                      >
                        {isActioning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Send Invoice
                      </button>
                    )}

                    {inv.status === 'sent' && (
                      <button
                        onClick={() => handleMarkPaid(inv)}
                        disabled={isActioning}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#10b981', borderRadius: 8, color: '#fff', border: 'none', cursor: isActioning ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: isActioning ? 0.6 : 1 }}
                      >
                        {isActioning ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Mark Paid
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
