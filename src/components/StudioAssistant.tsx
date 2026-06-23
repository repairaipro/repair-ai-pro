'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Send, Loader2, Sparkles, ChevronDown, RotateCcw } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

const QUICK_PROMPTS = [
  { label: '💰 Price a job',      text: 'How much should I charge for a standard bathroom faucet replacement in Houston?' },
  { label: '✍️ Draft a message',  text: 'Write a professional message to a homeowner explaining I need to reschedule tomorrow\'s job by 2 hours due to an emergency on another job.' },
  { label: '⭐ Handle a review',  text: 'A homeowner left me 3 stars saying "took longer than expected." Write a professional response.' },
  { label: '📈 Win more bids',    text: 'What are the top 3 things I can do to win more bids this month on RepairAI?' },
  { label: '💼 Boost my profile', text: 'My profile has 2 reviews and a 4.2 rating. What should I focus on to get more leads?' },
  { label: '🧾 Estimate taxes',   text: 'I\'ve made about $8,000 this month as a 1099 contractor. Roughly how much should I set aside for taxes?' },
];

export default function StudioAssistant() {
  const { user } = useAuth();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      // Opening greeting
      setMessages([{
        role: 'assistant',
        content: "Hey! I'm your AI business advisor. Ask me anything — pricing, how to handle a difficult client, bid strategy, tax estimates, message drafts. What's on your mind?",
      }]);
    }
  }, [open, messages.length]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading || !user) return;

    const next: Message[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/ai/studio-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error ?? 'No response');
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function reset() {
    setMessages([]);
    setInput('');
    setError('');
  }

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.25)' }}>

      {/* ── Toggle header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', cursor: 'pointer', border: 'none',
          background: open
            ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.1))'
            : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))',
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px -4px rgba(99,102,241,0.5)',
        }}>
          <Sparkles className="w-4 h-4" style={{ color: '#fff' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>AI Business Advisor</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-4)', margin: 0 }}>
            Pricing · messages · strategy · taxes
          </p>
        </div>
        <ChevronDown
          className="w-4 h-4"
          style={{ color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {/* ── Chat body ── */}
      {open && (
        <div style={{ background: 'var(--color-surface)' }}>

          {/* Message thread */}
          <div style={{ maxHeight: 420, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginRight: 8, marginTop: 2,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles style={{ width: 12, height: 12, color: '#fff' }} />
                  </div>
                )}
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'var(--color-surface-2)',
                  border: m.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: m.role === 'user' ? '#fff' : 'var(--color-text)',
                  whiteSpace: 'pre-wrap',
                }}>
                  <FormattedMessage content={m.content} />
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles style={{ width: 12, height: 12, color: '#fff' }} />
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                  background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#818cf8',
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p style={{ fontSize: 11, color: 'var(--color-error)', textAlign: 'center' }}>
                ⚠ {error} · <button onClick={() => send()} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>Retry</button>
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick prompts (only shown when just greeting is visible) */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => send(p.text)}
                  disabled={loading}
                  style={{
                    padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-3)', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{
            display: 'flex', gap: 8, padding: '12px 16px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-2)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything about your business…"
              rows={1}
              disabled={loading}
              style={{
                flex: 1, resize: 'none', padding: '9px 12px', borderRadius: 12,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', fontSize: 13, outline: 'none',
                lineHeight: 1.5, maxHeight: 100, overflowY: 'auto',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  width: 38, height: 38, borderRadius: 10, border: 'none',
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'var(--color-surface-2)',
                  color: input.trim() && !loading ? '#fff' : 'var(--color-text-4)',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  boxShadow: input.trim() && !loading ? '0 4px 12px -4px rgba(99,102,241,0.5)' : 'none',
                }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
              {messages.length > 1 && (
                <button
                  onClick={reset}
                  title="Clear chat"
                  style={{
                    width: 38, height: 24, borderRadius: 8, border: 'none',
                    background: 'transparent', color: 'var(--color-text-4)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <style>{`
            @keyframes pulse {
              0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

/* Renders markdown-lite: **bold**, bullet lists */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/\*\*(.+?)\*\*/g);
        const formatted = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>
        );
        // Bullet lines
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} style={{ display: 'flex', gap: 6, marginTop: i > 0 ? 3 : 0 }}><span style={{ opacity: 0.5 }}>•</span><span>{formatted}</span></div>;
        }
        if (line === '') return <div key={i} style={{ height: 6 }} />;
        return <div key={i} style={{ marginTop: i > 0 ? 2 : 0 }}>{formatted}</div>;
      })}
    </>
  );
}
