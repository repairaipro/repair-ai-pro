'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Volume2, VolumeX, Trash2, Paperclip, Send,
  Wrench, Clock, DollarSign, AlertTriangle,
  ListChecks, Package, Loader2, Sparkles,
  CheckCircle2, ChevronDown, ChevronUp, Camera,
} from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import { speak, stopSpeaking } from '@/lib/useTTS';

/* ─────────────────────────────── types ─── */

type ExplainMode = 'beginner' | 'homeowner' | 'pro';

interface RepairPlan {
  summary:      string;
  difficulty:   string;
  time_required: string;
  steps:        string[];
  tools:        string[];
  parts:        string[];
  warnings:     string[];
  cost_estimate: { diy: string; pro: string };
}

interface ChatMessage {
  id:         string;
  role:       'user' | 'assistant';
  content:    string;
  image?:     string | null;
  repairPlan?: RepairPlan | null;
  timestamp:  number;
}

/* ─────────────────────────── suggestions ─── */

const SUGGESTIONS = [
  { icon: '🚿', text: 'My faucet is dripping constantly' },
  { icon: '❄️', text: 'AC is running but not cooling the house' },
  { icon: '⚡', text: 'Outlet sparks when I plug something in' },
  { icon: '🏠', text: 'Roof is leaking after the rainstorm' },
  { icon: '🚽', text: 'Toilet keeps running after every flush' },
  { icon: '🔥', text: 'Furnace won\'t turn on this winter' },
];

/* ─────────────────────────── markdown ─── */

function renderMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const out: string[] = [];
  let inUL = false;
  let inOL = false;

  const closeList = () => {
    if (inUL) { out.push('</ul>'); inUL = false; }
    if (inOL) { out.push('</ol>'); inOL = false; }
  };

  const inline = (s: string) =>
    s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>');

  for (const line of lines) {
    const l = inline(line);

    if (/^### /.test(l)) {
      closeList();
      out.push(`<h4 class="ai-h4">${l.slice(4)}</h4>`);
    } else if (/^## /.test(l)) {
      closeList();
      out.push(`<h3 class="ai-h3">${l.slice(3)}</h3>`);
    } else if (/^# /.test(l)) {
      closeList();
      out.push(`<h2 class="ai-h2">${l.slice(2)}</h2>`);
    } else {
      const ul = l.match(/^[-*•]\s+(.+)$/);
      const ol = !ul && l.match(/^\d+\.\s+(.+)$/);
      if (ul) {
        if (!inUL) { closeList(); out.push('<ul class="ai-ul">'); inUL = true; }
        out.push(`<li>${ul[1]}</li>`);
      } else if (ol) {
        if (!inOL) { closeList(); out.push('<ol class="ai-ol">'); inOL = true; }
        out.push(`<li>${ol[1]}</li>`);
      } else {
        closeList();
        if (!l.trim()) out.push('<div class="ai-gap"></div>');
        else out.push(`<p class="ai-p">${l}</p>`);
      }
    }
  }

  closeList();
  return out.join('');
}

function AIProse({ text }: { text: string }) {
  return (
    <div
      className="ai-prose"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}

/* ─────────────────────── repair plan card ─── */

function RepairPlanCard({ plan }: { plan: RepairPlan }) {
  const [open, setOpen] = useState(true);

  const diffColor =
    plan.difficulty === 'Easy'       ? 'var(--color-success)' :
    plan.difficulty === 'Medium'     ? 'var(--color-warning)' :
    plan.difficulty === 'Hard'       ? '#f97316' :
    plan.difficulty === 'Call a Pro' ? 'var(--color-error)'   : 'var(--color-brand)';

  return (
    <div
      className="mt-3"
      style={{
        background:   'var(--color-bg-2)',
        border:       '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow:     'hidden',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3"
        style={{ background: 'rgba(99,102,241,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <Wrench size={16} style={{ color: 'var(--color-brand)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)' }}>
            Repair Plan
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: `${diffColor}22`, color: diffColor }}
          >
            {plan.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-3" style={{ color: 'var(--color-text-3)', fontSize: '0.75rem' }}>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {plan.time_required}
          </span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-4" style={{ fontSize: '0.85rem' }}>
          {/* Summary */}
          <p style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>{plan.summary}</p>

          {/* Cost */}
          <div
            className="flex gap-4 flex-wrap p-3 rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 600 }}>
                <DollarSign size={11} /> DIY Cost
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{plan.cost_estimate?.diy || 'N/A'}</div>
            </div>
            <div style={{ width: 1, background: 'var(--color-border)' }} />
            <div>
              <div className="flex items-center gap-1 mb-0.5" style={{ color: 'var(--color-brand)', fontSize: '0.75rem', fontWeight: 600 }}>
                <DollarSign size={11} /> Pro Cost
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{plan.cost_estimate?.pro || 'N/A'}</div>
            </div>
          </div>

          {/* Steps */}
          {plan.steps?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.8rem' }}>
                <ListChecks size={14} style={{ color: 'var(--color-brand)' }} /> Steps
              </div>
              <ol className="space-y-1.5" style={{ paddingLeft: '1.25rem', listStyle: 'decimal' }}>
                {plan.steps.map((s, i) => (
                  <li key={i} style={{ color: 'var(--color-text-2)', lineHeight: 1.5 }}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Tools + Parts */}
          <div className="grid grid-cols-2 gap-3">
            {plan.tools?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.8rem' }}>
                  <Wrench size={13} style={{ color: 'var(--color-warning)' }} /> Tools
                </div>
                <ul className="space-y-1">
                  {plan.tools.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5" style={{ color: 'var(--color-text-2)', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--color-warning)', marginTop: 2 }}>•</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.parts?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.8rem' }}>
                  <Package size={13} style={{ color: 'var(--color-info)' }} /> Parts
                </div>
                <ul className="space-y-1">
                  {plan.parts.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5" style={{ color: 'var(--color-text-2)', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--color-info)', marginTop: 2 }}>•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Warnings */}
          {plan.warnings?.length > 0 && (
            <div
              className="p-3 rounded-xl space-y-1"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <div className="flex items-center gap-1.5 mb-1" style={{ fontWeight: 700, color: 'var(--color-error)', fontSize: '0.8rem' }}>
                <AlertTriangle size={13} /> Safety Warnings
              </div>
              {plan.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5" style={{ color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 2 }}>⚠</span> {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── main page ─── */

export default function AIChatPage() {
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [inputText,    setInputText]    = useState('');
  const [image,        setImage]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [ttsEnabled,   setTtsEnabled]   = useState(false);
  const [mode,         setMode]         = useState<ExplainMode>('homeowner');
  const [error,        setError]        = useState('');
  const [planLoading,  setPlanLoading]  = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── persistence ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('repairgpt-chat');
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('repairgpt-chat', JSON.stringify(messages)); } catch { /* ignore */ }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [messages]);

  /* ── auto-speak ── */
  useEffect(() => {
    if (!ttsEnabled) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && !last.repairPlan) {
      speak(last.content);
    }
  }, [messages, ttsEnabled]);

  /* ── auto-grow textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [inputText]);

  /* ── voice transcript → text ── */
  const handleTranscript = useCallback((text: string) => {
    setInputText(prev => prev ? `${prev} ${text}` : text);
    setError('');
  }, []);

  /* ── image upload ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10 MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  /* ── send message ── */
  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && !image) return;
    if (loading) return;

    setError('');
    const userMsg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   trimmed || '(Image attached)',
      image:     image,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setImage(null);
    setLoading(true);

    // Build history for context (exclude current message, last 8 prior)
    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/ai-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:  trimmed || 'Analyze this image.',
          imageUrl: image,
          history,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setMessages(prev => [
        ...prev,
        {
          id:        crypto.randomUUID(),
          role:      'assistant',
          content:   data.reply || 'No response.',
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* ── repair plan ── */
  async function generateRepairPlan() {
    const last = [...messages].reverse().find(m => m.role === 'user');
    if (!last) return;

    setPlanLoading(true);
    setError('');

    try {
      const res = await fetch('/api/repair-plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt: last.content, image: last.image || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to generate plan');

      setMessages(prev => [
        ...prev,
        {
          id:          crypto.randomUUID(),
          role:        'assistant',
          content:     'Here\'s your step-by-step repair plan:',
          repairPlan:  data.repair,
          timestamp:   Date.now(),
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Could not generate repair plan.');
    } finally {
      setPlanLoading(false);
    }
  }

  /* ── clear chat ── */
  function clearChat() {
    stopSpeaking();
    setMessages([]);
    setInputText('');
    setImage(null);
    setError('');
    localStorage.removeItem('repairgpt-chat');
  }

  /* ── enter to send, shift+enter for newline ── */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Inject AI-prose styles */}
      <style>{`
        .ai-prose { font-size: 0.875rem; line-height: 1.65; color: var(--color-text-2); }
        .ai-prose .ai-h2 { font-size: 1.05rem; font-weight: 700; color: var(--color-text); margin: 0.75rem 0 0.25rem; }
        .ai-prose .ai-h3 { font-size: 0.95rem; font-weight: 700; color: var(--color-text); margin: 0.6rem 0 0.2rem; }
        .ai-prose .ai-h4 { font-size: 0.875rem; font-weight: 700; color: var(--color-brand-hover); margin: 0.5rem 0 0.1rem; }
        .ai-prose .ai-p  { margin: 0.2rem 0; color: var(--color-text-2); }
        .ai-prose .ai-gap { height: 0.6rem; }
        .ai-prose .ai-ul, .ai-prose .ai-ol { padding-left: 1.25rem; margin: 0.3rem 0; }
        .ai-prose .ai-ul { list-style: disc; }
        .ai-prose .ai-ol { list-style: decimal; }
        .ai-prose li { margin: 0.2rem 0; color: var(--color-text-2); }
        .ai-prose .ai-code {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.8rem;
          background: rgba(99,102,241,0.12);
          color: #a5b4fc;
          padding: 0.1em 0.4em;
          border-radius: 4px;
          border: 1px solid rgba(99,102,241,0.2);
        }
        .ai-prose strong { color: var(--color-text); font-weight: 700; }
        .ai-prose em { color: var(--color-text-2); font-style: italic; }

        @keyframes typingPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        .typing-dot { animation: typingPulse 1.2s infinite ease-in-out; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-enter { animation: msgFadeIn 0.25s ease-out forwards; }
      `}</style>

      {/* Full-screen container: escape main's p-6 */}
      <div
        className="-mx-6 -mt-6 -mb-6 flex flex-col"
        style={{ height: 'calc(100dvh - 56px)', background: 'var(--color-bg)' }}
      >
        {/* ══════════════════ HEADER BAR ══════════════════ */}
        <div
          className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3"
          style={{
            background:  'var(--color-bg-2)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.5)' }}
            >
              <Sparkles size={15} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
                RepairGPT
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>
                Powered by GPT-4o + Whisper
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Mode pills */}
            <div
              className="hidden sm:flex items-center gap-1 p-1 rounded-lg"
              style={{ background: 'var(--color-surface)' }}
            >
              {(['beginner', 'homeowner', 'pro'] as ExplainMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150"
                  style={{
                    background: mode === m ? 'var(--color-brand)' : 'transparent',
                    color:      mode === m ? '#fff' : 'var(--color-text-3)',
                  }}
                >
                  {m === 'beginner' ? 'Beginner' : m === 'homeowner' ? 'Owner' : 'Pro'}
                </button>
              ))}
            </div>

            {/* TTS */}
            <button
              type="button"
              onClick={() => { setTtsEnabled(e => !e); if (ttsEnabled) stopSpeaking(); }}
              className="btn btn-sm"
              title={ttsEnabled ? 'Mute read-aloud' : 'Enable read-aloud'}
              style={{
                background:   ttsEnabled ? 'rgba(34,197,94,0.15)' : 'var(--color-surface)',
                border:       ttsEnabled ? '1px solid rgba(34,197,94,0.35)' : '1px solid var(--color-border)',
                color:        ttsEnabled ? 'var(--color-success)' : 'var(--color-text-3)',
                padding:      '0.4rem',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* Repair plan */}
            {hasMessages && (
              <button
                type="button"
                onClick={generateRepairPlan}
                disabled={planLoading || loading}
                className="btn btn-sm btn-secondary hidden sm:flex items-center gap-1.5"
                style={{ fontSize: '0.78rem' }}
              >
                {planLoading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Wrench size={13} />}
                Repair Plan
              </button>
            )}

            {/* Clear */}
            {hasMessages && (
              <button
                type="button"
                onClick={clearChat}
                className="btn btn-sm btn-ghost"
                title="Clear chat"
                style={{ padding: '0.4rem', color: 'var(--color-text-3)' }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════ MESSAGES ══════════════════ */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* ── empty state ── */}
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-16">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.1))', border: '1px solid var(--color-border-brand)' }}
              >
                <Sparkles size={36} style={{ color: 'var(--color-brand)' }} />
              </div>
              <h2
                style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.03em', color: 'var(--color-text)', marginBottom: '0.5rem' }}
              >
                What can I fix for you?
              </h2>
              <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', maxWidth: 360, lineHeight: 1.6 }}>
                Describe your issue, upload a photo, or tap the mic to speak. I'll diagnose the problem and walk you through every step.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center" style={{ maxWidth: 480 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => { setInputText(s.text); textareaRef.current?.focus(); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                      background:  'var(--color-surface)',
                      border:      '1px solid var(--color-border)',
                      color:       'var(--color-text-2)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-brand)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--color-text-2)';
                    }}
                  >
                    <span>{s.icon}</span> {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── messages ── */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`msg-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI avatar */}
              {msg.role === 'assistant' && (
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mr-2 mt-0.5"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 10px rgba(99,102,241,0.4)' }}
                >
                  <Sparkles size={12} style={{ color: '#fff' }} />
                </div>
              )}

              <div style={{ maxWidth: '80%' }}>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={
                    msg.role === 'user'
                      ? {
                          background:    'linear-gradient(135deg,#4f46e5,#6366f1)',
                          borderRadius:  '18px 18px 4px 18px',
                          boxShadow:     '0 2px 12px rgba(99,102,241,0.3)',
                        }
                      : {
                          background:   'var(--color-surface)',
                          border:       '1px solid var(--color-border)',
                          borderRadius: '18px 18px 18px 4px',
                        }
                  }
                >
                  {/* Image */}
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Attached"
                      className="rounded-xl mb-2"
                      style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'cover' }}
                    />
                  )}

                  {/* Text */}
                  {msg.role === 'user' ? (
                    <p style={{ fontSize: '0.875rem', color: '#fff', lineHeight: 1.6, margin: 0 }}>
                      {msg.content}
                    </p>
                  ) : (
                    <AIProse text={msg.content} />
                  )}
                </div>

                {/* Repair plan card */}
                {msg.repairPlan && <RepairPlanCard plan={msg.repairPlan} />}

                {/* Timestamp */}
                <div
                  className={`mt-1 text-[10px] px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--color-text-4)' }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* ── typing indicator ── */}
          {loading && (
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                <Sparkles size={12} style={{ color: '#fff' }} />
              </div>
              <div
                className="flex items-center gap-1 px-4 py-3 rounded-2xl"
                style={{
                  background:   'var(--color-surface)',
                  border:       '1px solid var(--color-border)',
                  borderRadius: '18px 18px 18px 4px',
                }}
              >
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="typing-dot w-2 h-2 rounded-full block"
                    style={{ background: 'var(--color-brand)', animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ══════════════════ ERROR BANNER ══════════════════ */}
        {error && (
          <div
            className="flex-shrink-0 mx-4 mb-2 px-4 py-2.5 rounded-xl flex items-center gap-2"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border:     '1px solid rgba(239,68,68,0.3)',
              fontSize:   '0.8rem',
              color:      '#fca5a5',
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, color: 'var(--color-error)' }} />
            <span style={{ flex: 1 }}>{error}</span>
            <button type="button" onClick={() => setError('')} style={{ color: 'var(--color-text-3)', padding: '0 4px' }}>×</button>
          </div>
        )}

        {/* ══════════════════ INPUT AREA ══════════════════ */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            background:   'var(--color-bg-2)',
            borderTop:    '1px solid var(--color-border)',
          }}
        >
          {/* Mode selector — mobile only */}
          <div className="sm:hidden flex gap-1 mb-2 overflow-x-auto pb-1">
            {(['beginner', 'homeowner', 'pro'] as ExplainMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background: mode === m ? 'var(--color-brand)' : 'var(--color-surface)',
                  color:      mode === m ? '#fff' : 'var(--color-text-3)',
                  border:     `1px solid ${mode === m ? 'transparent' : 'var(--color-border)'}`,
                }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
            {hasMessages && (
              <button
                type="button"
                onClick={generateRepairPlan}
                disabled={planLoading || loading}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: 'var(--color-surface)',
                  color:      'var(--color-text-3)',
                  border:     '1px solid var(--color-border)',
                }}
              >
                {planLoading ? <Loader2 size={11} className="animate-spin" /> : <Wrench size={11} />}
                Plan
              </button>
            )}
          </div>

          {/* Image preview */}
          {image && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative">
                <img
                  src={image}
                  alt="Preview"
                  className="rounded-xl object-cover"
                  style={{ width: 56, height: 56, border: '1px solid var(--color-border)' }}
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-error)', color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}
                >
                  ×
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Image ready to send</span>
            </div>
          )}

          {/* Main input row */}
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            {/* File upload button */}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Attach image or take photo"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150"
              style={{
                background:   'var(--color-surface)',
                border:       '1px solid var(--color-border)',
                color:        'var(--color-text-3)',
                marginBottom: '2px',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-brand)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-brand)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)';
              }}
            >
              <Camera size={18} />
            </button>

            {/* Text area */}
            <div
              className="flex-1 flex items-end rounded-2xl px-3.5 py-2 gap-2"
              style={{
                background: 'var(--color-surface)',
                border:     '1px solid var(--color-border)',
                transition: 'border-color 0.15s',
              }}
              onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--color-border-brand)'}
              onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            >
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your repair issue… or tap 🎤"
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none"
                style={{
                  fontSize:   '0.9rem',
                  color:      'var(--color-text)',
                  lineHeight: 1.5,
                  maxHeight:  140,
                  overflowY:  'auto',
                }}
              />
            </div>

            {/* Voice Recorder */}
            <div className="flex-shrink-0 mb-1">
              <VoiceRecorder
                onTranscript={handleTranscript}
                onError={msg => setError(msg)}
                size="md"
                disabled={loading}
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={loading || (!inputText.trim() && !image)}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150"
              style={{
                background:    'linear-gradient(135deg,#4f46e5,#6366f1)',
                border:        '1px solid rgba(99,102,241,0.5)',
                color:         '#fff',
                boxShadow:     '0 0 18px rgba(99,102,241,0.35)',
                opacity:       loading || (!inputText.trim() && !image) ? 0.4 : 1,
                cursor:        loading || (!inputText.trim() && !image) ? 'not-allowed' : 'pointer',
                marginBottom:  '2px',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                if (!el.disabled) el.style.boxShadow = '0 0 28px rgba(99,102,241,0.55)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 18px rgba(99,102,241,0.35)';
              }}
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </form>

          {/* Hint */}
          <p className="text-center mt-2" style={{ fontSize: '0.68rem', color: 'var(--color-text-4)' }}>
            Tap 🎤 to speak · 📷 to attach a photo · Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
