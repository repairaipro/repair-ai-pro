'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle, AlertCircle, Loader2, Shield, Lock,
  CreditCard, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import FinancingOption from '@/components/FinancingOption';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

/* ─── Stripe Elements checkout form (PCI-compliant: card data never touches our server) ── */
function InvoiceCheckoutForm({
  amountLabel,
  onSuccess,
}: {
  amountLabel: string;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError(`Payment not completed (status: ${paymentIntent?.status ?? 'unknown'})`);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PaymentElement />

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !stripe}
        style={{
          width: '100%', padding: '16px', marginTop: 8,
          background: submitting ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        {submitting ? (
          <><Loader2 size={18} className="animate-spin" /> Processing…</>
        ) : (
          <><Shield size={18} /> Pay {amountLabel} Securely</>
        )}
      </button>
    </form>
  );
}

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: 'labor' | 'parts' | 'materials' | 'other';
};

type Invoice = {
  id: string;
  jobId?: string;
  invoiceNumber: string;
  status: string;
  total: number;
  subtotal: number;
  laborSubtotal?: number;
  partsSubtotal?: number;
  taxAmount?: number;
  taxRate?: number;
  lineItems?: LineItem[];
  jobSummary?: string;
  jobDescription?: string;
  warrantyStatement?: string;
  notes?: string;
  contractorInfo?: {
    name: string;
    email: string;
    phone: string;
    trade: string;
  };
  homeownerInfo?: {
    address: string;
  };
  createdAt?: string;
  sentAt?: string;
  paidAt?: string;
  stripePaymentIntentClientSecret?: string;
};

export default function PayInvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!invoiceId) return;
    fetchInvoice();
  }, [invoiceId]);

  async function fetchInvoice() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Invoice not found');
      setInvoice(data.invoice);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* Stripe confirmed payment client-side — server verifies & marks invoice paid */
  async function handlePaymentSuccess(paymentIntentId: string) {
    setFormError('');
    setPaymentStatus('processing');
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentStatus('success');
        setInvoice((prev) => prev ? { ...prev, status: 'paid' } : prev);
      } else {
        throw new Error(data.error || 'Payment verification failed');
      }
    } catch (e: any) {
      setFormError(e.message);
      setPaymentStatus('failed');
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function formatDate(iso?: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', gap: 16 }}>
        <Loader2 size={36} className="animate-spin" color="#6366f1" />
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading invoice…</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', gap: 16, padding: 24 }}>
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ color: '#fff', margin: 0 }}>Invoice Not Found</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', maxWidth: 340 }}>{error || 'This invoice does not exist or has been removed.'}</p>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid' || paymentStatus === 'success';
  const isCancelled = invoice.status === 'cancelled';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 80px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: 'rgba(99,102,241,0.15)', borderRadius: 40, border: '1px solid rgba(99,102,241,0.3)', marginBottom: 8 }}>
            <FileText size={16} color="#6366f1" />
            <span style={{ fontSize: 14, color: '#a5b4fc', fontWeight: 600 }}>RepairAI Pro</span>
          </div>
          <h1 style={{ fontSize: 13, color: '#6b7280', margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>Secure Payment Portal</h1>
        </div>

        {/* Invoice Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden', marginBottom: 24 }}
        >
          {/* Header */}
          <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600, marginBottom: 4 }}>{invoice.invoiceNumber}</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>From {invoice.contractorInfo?.name || 'Your Contractor'}</div>
                {invoice.contractorInfo?.trade && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{invoice.contractorInfo.trade}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{formatCurrency(invoice.total)}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  {invoice.sentAt ? `Sent ${formatDate(invoice.sentAt)}` : formatDate(invoice.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Job Summary */}
          {(invoice.jobSummary || invoice.jobDescription) && (
            <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Work Performed</div>
              <p style={{ color: '#d1d5db', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                {invoice.jobSummary || invoice.jobDescription}
              </p>
            </div>
          )}

          {/* Line Items Toggle */}
          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                style={{ width: '100%', padding: '14px 28px', background: 'transparent', border: 'none', color: '#a5b4fc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}
              >
                <span>View Itemized Breakdown</span>
                {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showBreakdown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ padding: '0 28px 16px' }}
                >
                  {['labor', 'parts', 'materials', 'other'].map((cat) => {
                    const items = invoice.lineItems!.filter((i) => i.category === cat);
                    if (!items.length) return null;
                    return (
                      <div key={cat} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                          {cat === 'labor' ? 'Labor' : cat === 'parts' ? 'Parts & Materials' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </div>
                        {items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ flex: 1, paddingRight: 12 }}>
                              <div style={{ fontSize: 13, color: '#e5e7eb' }}>{item.description}</div>
                              {item.quantity !== 1 && (
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                  {item.quantity} × {formatCurrency(item.unitPrice)}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{formatCurrency(item.total)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          )}

          {/* Totals */}
          <div style={{ padding: '16px 28px' }}>
            {invoice.laborSubtotal !== undefined && invoice.partsSubtotal !== undefined && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
                  <span>Labor</span><span>{formatCurrency(invoice.laborSubtotal || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
                  <span>Parts & Materials</span><span>{formatCurrency(invoice.partsSubtotal || 0)}</span>
                </div>
              </>
            )}
            {invoice.taxAmount !== undefined && invoice.taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
                <span>Tax ({((invoice.taxRate || 0) * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 6 }}>
              <span>Total Due</span><span style={{ color: '#6366f1' }}>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {/* Warranty */}
          {invoice.warrantyStatement && (
            <div style={{ margin: '0 28px 20px', padding: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Warranty</div>
              <p style={{ fontSize: 12, color: '#6ee7b7', margin: 0, lineHeight: 1.5 }}>{invoice.warrantyStatement}</p>
            </div>
          )}
        </motion.div>

        {/* Financing — only on unpaid, big-ticket invoices */}
        {!isPaid && !isCancelled && (
          <div style={{ marginBottom: 24 }}>
            <FinancingOption total={invoice.total} variant="card" />
          </div>
        )}

        {/* Payment Section */}
        {isPaid ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: 40, textAlign: 'center' }}
          >
            <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800 }}>Payment Received!</h2>
            <p style={{ color: '#6ee7b7', margin: 0, fontSize: 15 }}>
              {invoice.paidAt ? `Paid on ${formatDate(invoice.paidAt)}` : 'Your payment has been processed successfully.'}
            </p>
          </motion.div>
        ) : isCancelled ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, textAlign: 'center' }}>
            <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: '#f87171', margin: '0 0 8px' }}>Invoice Cancelled</h3>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: 14 }}>This invoice is no longer active. Please contact your contractor.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <CreditCard size={20} color="#6366f1" />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Pay Now</h2>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: '4px 12px' }}>
                <Lock size={12} color="#10b981" />
                <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>SSL Secured</span>
              </div>
            </div>

            {invoice.stripePaymentIntentClientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: invoice.stripePaymentIntentClientSecret,
                  appearance: { theme: 'night', variables: { colorPrimary: '#6366f1' } },
                }}
              >
                <InvoiceCheckoutForm
                  amountLabel={formatCurrency(invoice.total)}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 13 }}>
                This invoice isn&apos;t ready for payment yet. Please contact your contractor.
              </div>
            )}

            {formError && (
              <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>
                {formError}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Lock size={12} color="#6b7280" />
              <span style={{ fontSize: 12, color: '#6b7280' }}>256-bit SSL encryption. Powered by Stripe.</span>
            </div>
          </motion.div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Notes from Contractor</div>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
