'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Loader2, Sparkles, Send, CheckCircle2,
  DollarSign, Clock, Edit3, Plus, Trash2, AlertCircle,
  Download, Wrench, Package,
} from 'lucide-react';
import type { InvoiceLineItem, InvoiceData } from '@/lib/invoiceGenerator';

type Props = {
  jobId: string;
  isContractor: boolean;
  authToken: string;
  jobStatus: string;
};

export default function SmartInvoice({ jobId, isContractor, authToken, jobStatus }: Props) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [tab, setTab] = useState<'preview' | 'edit'>('preview');

  useEffect(() => {
    fetchInvoice();
  }, [jobId]);

  async function fetchInvoice() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/invoice`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.invoice) {
        setInvoice(data.invoice);
      }
    } catch {
      // No invoice yet
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          timeSpentHours: timeSpent ? parseFloat(timeSpent) : undefined,
          taxRate: taxRate ? parseFloat(taxRate) / 100 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setInvoice(data.invoice ? { id: data.invoiceId, ...data.invoice } : null);
      await fetchInvoice();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!invoice?.id) return;
    setSending(true);
    try {
      await fetch(`/api/jobs/${jobId}/invoice`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ invoiceId: invoice.id, action: 'send' }),
      });
      await fetchInvoice();
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateLine(index: number, field: keyof InvoiceLineItem, value: any) {
    if (!invoice) return;
    const lines = [...invoice.lineItems];
    lines[index] = { ...lines[index], [field]: value };
    // Recalculate total
    lines[index].total = lines[index].quantity * lines[index].unitPrice;

    const res = await fetch(`/api/jobs/${jobId}/invoice`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ invoiceId: invoice.id, lineItems: lines }),
    });
    if (res.ok) {
      await fetchInvoice();
    }
    setEditingLine(null);
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-brand)' }} />
          <span className="text-sm" style={{ color: 'var(--color-text-3)' }}>Loading invoice...</span>
        </div>
      </div>
    );
  }

  // No invoice yet — show generator for contractor
  if (!invoice && isContractor) {
    return (
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)' }}>
            <Sparkles size={18} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              AI Invoice Generator
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              Auto-generates from job photos, description, and market rates
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)' }}>
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-3)' }}>
              Time on site (hrs)
            </label>
            <input
              type="number"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="e.g. 2.5"
              min="0"
              step="0.5"
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-3)' }}>
              Tax rate (%)
            </label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="0"
              min="0"
              max="20"
              step="0.5"
              className="input w-full text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn btn-primary w-full"
          style={{ justifyContent: 'center' }}
        >
          {generating ? (
            <><Loader2 size={15} className="animate-spin" /> Analyzing job &amp; generating...</>
          ) : (
            <><Sparkles size={15} /> Generate AI Invoice</>
          )}
        </button>

        <p className="text-xs text-center" style={{ color: 'var(--color-text-4)' }}>
          AI analyzes work photos, defects found, and local market rates
        </p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(99,102,241,0.05)', border: '1px dashed rgba(99,102,241,0.2)' }}>
        <FileText size={24} style={{ color: 'var(--color-text-4)', margin: '0 auto 8px' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
          Invoice will appear here once the contractor generates it.
        </p>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    draft: '#fbbf24',
    sent: '#818cf8',
    paid: '#34d399',
    cancelled: '#6b7280',
  };
  const statusLabel: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent — Awaiting Payment',
    paid: 'Paid ✓',
    cancelled: 'Cancelled',
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      {/* Invoice Header */}
      <div className="p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} style={{ color: 'var(--color-brand)' }} />
              <span className="font-bold text-sm" style={{ color: 'var(--color-brand)' }}>
                {invoice.invoiceNumber || 'INVOICE'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
              {invoice.contractorInfo?.name}
              {invoice.contractorInfo?.phone && ` · ${invoice.contractorInfo.phone}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: 'var(--color-success)' }}>
              ${(invoice.total || 0).toFixed(2)}
            </p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: `${statusColor[invoice.status] || '#fbbf24'}18`,
                color: statusColor[invoice.status] || '#fbbf24',
              }}>
              {statusLabel[invoice.status] || 'Draft'}
            </span>
          </div>
        </div>

        {/* Confidence badge */}
        {invoice.confidence && (
          <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-4)' }}>
            <Sparkles size={11} />
            {invoice.pricingInsight} · {invoice.confidence}% confidence
          </div>
        )}
      </div>

      {/* Tabs — contractor only */}
      {isContractor && invoice.status === 'draft' && (
        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          {(['preview', 'edit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold capitalize transition"
              style={{
                color: tab === t ? 'var(--color-brand)' : 'var(--color-text-4)',
                borderBottom: tab === t ? '2px solid var(--color-brand)' : '2px solid transparent',
                background: 'var(--color-surface)',
              }}
            >
              {t === 'preview' ? 'Invoice Preview' : 'Edit Line Items'}
            </button>
          ))}
        </div>
      )}

      {/* Line Items */}
      <div className="p-5 space-y-2" style={{ background: 'var(--color-surface)' }}>
        {/* Job Summary */}
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--color-text-3)' }}>
          {invoice.jobSummary}
        </p>

        {/* Labor items */}
        {invoice.lineItems?.filter((i: InvoiceLineItem) => i.category === 'labor').length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench size={11} style={{ color: 'var(--color-brand)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>Labor</span>
            </div>
            {invoice.lineItems
              .filter((i: InvoiceLineItem) => i.category === 'labor')
              .map((item: InvoiceLineItem, idx: number) => (
                <LineItemRow
                  key={idx}
                  item={item}
                  index={idx}
                  editable={tab === 'edit' && isContractor && invoice.status === 'draft'}
                  onSave={(field, val) => handleUpdateLine(idx, field, val)}
                />
              ))}
          </div>
        )}

        {/* Parts/Materials items */}
        {invoice.lineItems?.filter((i: InvoiceLineItem) => i.category !== 'labor').length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Package size={11} style={{ color: 'var(--color-brand)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>Parts &amp; Materials</span>
            </div>
            {invoice.lineItems
              .filter((i: InvoiceLineItem) => i.category !== 'labor')
              .map((item: InvoiceLineItem, idx: number) => (
                <LineItemRow
                  key={idx}
                  item={item}
                  index={idx}
                  editable={tab === 'edit' && isContractor && invoice.status === 'draft'}
                  onSave={(field, val) => handleUpdateLine(idx, field, val)}
                />
              ))}
          </div>
        )}

        {/* Totals */}
        <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
          {invoice.laborSubtotal > 0 && (
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-3)' }}>
              <span>Labor subtotal</span>
              <span>${invoice.laborSubtotal.toFixed(2)}</span>
            </div>
          )}
          {invoice.partsSubtotal > 0 && (
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-3)' }}>
              <span>Parts subtotal</span>
              <span>${invoice.partsSubtotal.toFixed(2)}</span>
            </div>
          )}
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-3)' }}>
              <span>Tax ({((invoice.taxRate || 0) * 100).toFixed(1)}%)</span>
              <span>${invoice.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1" style={{ color: 'var(--color-text)' }}>
            <span>Total</span>
            <span className="text-lg" style={{ color: 'var(--color-success)' }}>
              ${(invoice.total || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Warranty */}
        {invoice.warrantyStatement && (
          <p className="text-xs mt-3 pt-3" style={{ color: 'var(--color-text-4)', borderTop: '1px solid var(--color-border)' }}>
            🛡️ {invoice.warrantyStatement}
          </p>
        )}

        {/* Notes */}
        {invoice.notes && (
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            📝 {invoice.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {isContractor && (
        <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          {invoice.status === 'draft' && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center' }}
            >
              {sending
                ? <><Loader2 size={14} className="animate-spin" /> Sending...</>
                : <><Send size={14} /> Send Invoice to Homeowner</>}
            </button>
          )}
          {invoice.status === 'sent' && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await fetch(`/api/jobs/${jobId}/invoice`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                    body: JSON.stringify({ invoiceId: invoice.id, action: 'mark_paid' }),
                  });
                  fetchInvoice();
                }}
                className="btn btn-sm flex-1"
                style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', justifyContent: 'center' }}
              >
                <CheckCircle2 size={13} /> Mark Paid
              </button>
            </div>
          )}
          {invoice.status === 'paid' && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold"
              style={{ color: 'var(--color-success)' }}>
              <CheckCircle2 size={16} /> Payment confirmed
            </div>
          )}

          {/* Regenerate */}
          {invoice.status === 'draft' && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn btn-secondary btn-sm w-full"
              style={{ justifyContent: 'center' }}
            >
              {generating
                ? <><Loader2 size={12} className="animate-spin" /> Regenerating...</>
                : <><Sparkles size={12} /> Regenerate with AI</>}
            </button>
          )}
        </div>
      )}

      {/* Homeowner pay button */}
      {!isContractor && invoice.status === 'sent' && (
        <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Invoice from {invoice.contractorInfo?.name}
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-4)' }}>
              {invoice.paymentTerms || 'Due upon completion'}
            </p>
            <p className="text-2xl font-black mb-3" style={{ color: 'var(--color-success)' }}>
              ${(invoice.total || 0).toFixed(2)}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              Pay securely via your dashboard or contact your contractor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function LineItemRow({
  item, index, editable, onSave,
}: {
  item: InvoiceLineItem;
  index: number;
  editable: boolean;
  onSave: (field: keyof InvoiceLineItem, value: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(item.quantity));
  const [price, setPrice] = useState(String(item.unitPrice));
  const [desc, setDesc] = useState(item.description);

  if (editing && editable) {
    return (
      <div className="p-2 rounded-lg mb-1 space-y-2" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <input
          className="input text-xs w-full"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description"
        />
        <div className="flex gap-2">
          <input
            type="number"
            className="input text-xs w-20"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Qty"
          />
          <input
            type="number"
            className="input text-xs flex-1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Unit price"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onSave('description', desc);
              onSave('quantity', parseFloat(qty));
              onSave('unitPrice', parseFloat(price));
              setEditing(false);
            }}
            className="btn btn-sm btn-primary flex-1"
            style={{ justifyContent: 'center' }}
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} className="btn btn-sm btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between py-1.5 px-2 rounded-lg group cursor-pointer"
      onClick={() => editable && setEditing(true)}
      style={{ ':hover': { background: 'var(--color-surface-2)' } } as any}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{item.description}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
          {item.quantity} {item.unit} × ${item.unitPrice.toFixed(2)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
          ${item.total.toFixed(2)}
        </span>
        {editable && (
          <Edit3 size={11} className="opacity-0 group-hover:opacity-100 transition" style={{ color: 'var(--color-brand)' }} />
        )}
      </div>
    </div>
  );
}
