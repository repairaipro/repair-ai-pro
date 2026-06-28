'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import { Send, Loader2, CheckCircle, Mail, MessageSquare, Clock } from 'lucide-react';

export default function ContactPage() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) { setError('Please fill in all required fields.'); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error('Failed');
      setSent(true);
    } catch {
      setError('Could not send message. Please email us directly at support@repairai.pro');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto px-4 py-12">

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Contact Us</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
            We typically respond within a few hours during business hours.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Info */}
          <div className="space-y-6">
            {[
              { icon: <Mail className="w-5 h-5" />, title: 'Email', desc: 'support@repairai.pro', sub: 'For general inquiries and support' },
              { icon: <MessageSquare className="w-5 h-5" />, title: 'Live chat', desc: 'Available in-app', sub: 'Sign in and use the chat icon' },
              { icon: <Clock className="w-5 h-5" />, title: 'Response time', desc: 'Within 4 hours', sub: 'Mon–Fri, 8am–6pm CT' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4 rounded-2xl p-5"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{item.icon}</div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{item.title}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-brand)' }}>{item.desc}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{item.sub}</p>
                </div>
              </div>
            ))}

            <div className="rounded-2xl p-5 space-y-2"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Contractor support</p>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                For Pro subscription billing, Stripe Connect issues, or account verification — use the subject line "Contractor Support" for priority routing.
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                For disputes or payment issues: include your Job ID in the message.
              </p>
            </div>
          </div>

          {/* Form */}
          {sent ? (
            <div className="flex flex-col items-center justify-center text-center py-16 gap-4 rounded-2xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <CheckCircle className="w-12 h-12" style={{ color: '#22c55e' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Message sent!</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
                We'll get back to you at {email} within a few hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl p-6"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required className="input" />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required className="input" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="input">
                  <option value="">Select a topic</option>
                  <option>General question</option>
                  <option>Contractor support</option>
                  <option>Payment or billing</option>
                  <option>Job dispute</option>
                  <option>Technical issue</option>
                  <option>Privacy or data request</option>
                  <option>Partnership inquiry</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>Message *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your question or issue in detail..." rows={5} required className="input resize-none" />
              </div>

              {error && <p className="text-xs" style={{ color: '#f87171' }}>⚠ {error}</p>}

              <button type="submit" disabled={sending} className="btn btn-primary btn-full">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send message</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
