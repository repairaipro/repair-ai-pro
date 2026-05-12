"use client";

import { useState } from "react";
import {
  X, Loader2, Clipboard, Check, ChevronDown, ChevronUp,
  FileText, HelpCircle, Camera, DollarSign, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

type BidPack = {
  title: string;
  summary: string;
  scope_of_work: string[];
  questions_to_confirm: string[];
  photo_requests: string[];
  bid_format: string[];
  safety_or_access_notes: string[];
};

type Props = {
  jobId: string;
  description: string;
  trade: string;
  city: string;
  onClose: () => void;
};

function Section({
  icon, title, items, color,
}: {
  icon: React.ReactNode; title: string; items: string[]; color: string;
}) {
  const [open, setOpen] = useState(true);
  if (!items?.length) return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all"
        style={{ background: 'var(--color-surface-2)', color }}
      >
        <span className="flex items-center gap-2">{icon} {title}</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <ul className="px-4 py-3 space-y-2" style={{ background: 'var(--color-surface)' }}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BidPackModal({ jobId, description, trade, city, onClose }: Props) {
  const { user }  = useAuth();
  const [pack,    setPack]    = useState<BidPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [copied,  setCopied]  = useState(false);

  async function generate() {
    if (!user) return;
    setLoading(true);
    setError("");
    setPack(null);
    try {
      const token = await user.getIdToken();
      const res   = await fetch("/api/bid-pack", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ description, trade, city }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setPack(data.bidPack);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    }
    setLoading(false);
  }

  function copyAll() {
    if (!pack) return;
    const text = [
      `# ${pack.title}`,
      `\n${pack.summary}`,
      `\n## Scope of Work\n${pack.scope_of_work.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      `\n## Questions to Confirm\n${pack.questions_to_confirm.map(q => `- ${q}`).join("\n")}`,
      `\n## Photo Requests\n${pack.photo_requests.map(p => `- ${p}`).join("\n")}`,
      `\n## Bid Format\n${pack.bid_format.map(b => `- ${b}`).join("\n")}`,
      pack.safety_or_access_notes?.length
        ? `\n## Safety / Access Notes\n${pack.safety_or_access_notes.map(n => `- ${n}`).join("\n")}`
        : "",
    ].join("").trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-brand-dim)' }}
            >
              <FileText size={15} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>AI Bid Pack</p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-4)' }}>{trade} · {city}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-4)' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ overscrollBehavior: 'contain' }}>

          {/* Job summary */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--color-text-3)' }}>
              {description}
            </p>
          </div>

          {/* Generate button */}
          {!pack && (
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="btn btn-primary btn-full"
              style={{ justifyContent: 'center' }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Generating bid pack…</>
                : <><FileText size={15} /> Generate AI Bid Pack</>}
            </button>
          )}

          {error && (
            <p className="text-xs px-3 py-2 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)' }}>
              {error}
            </p>
          )}

          {/* Generated pack */}
          {pack && (
            <div className="space-y-3">
              {/* Title + summary */}
              <div
                className="rounded-xl px-4 py-3 space-y-1"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{pack.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-3)' }}>{pack.summary}</p>
              </div>

              <Section icon={<FileText size={12} />}     title="Scope of Work"         items={pack.scope_of_work}           color="#818cf8" />
              <Section icon={<HelpCircle size={12} />}   title="Questions to Confirm"  items={pack.questions_to_confirm}    color="#60a5fa" />
              <Section icon={<Camera size={12} />}       title="Photo Requests"         items={pack.photo_requests}          color="#34d399" />
              <Section icon={<DollarSign size={12} />}   title="Bid Format"             items={pack.bid_format}              color="#fbbf24" />
              <Section icon={<AlertTriangle size={12} />}title="Safety / Access Notes"  items={pack.safety_or_access_notes}  color="#fb923c" />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center gap-2 px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {pack && (
            <button
              type="button"
              onClick={copyAll}
              className="btn btn-secondary btn-sm flex-1"
              style={{ justifyContent: 'center' }}
            >
              {copied
                ? <><Check size={13} style={{ color: 'var(--color-success)' }} /> Copied!</>
                : <><Clipboard size={13} /> Copy All</>}
            </button>
          )}
          {pack && (
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="btn btn-secondary btn-sm"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : "Regenerate"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ justifyContent: 'center' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
