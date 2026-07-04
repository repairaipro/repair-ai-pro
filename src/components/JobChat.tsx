'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/db';
import { Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Date;
  isCurrentUser: boolean;
}

interface JobChatProps {
  jobId: string;
  userId: string;
  userName: string;
  otherUserId: string;
  otherUserName: string;
}

export default function JobChat({ jobId, userId, userName, otherUserId, otherUserName }: JobChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live listener — Firestore pushes new messages instantly, no polling.
  // Rules already scope this to job participants (isParticipant(jobId)).
  useEffect(() => {
    const q = query(
      collection(db, 'jobs', jobId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              senderId: data.senderId,
              senderName: data.senderName,
              text: data.text,
              createdAt: data.createdAt?.toDate?.() ?? new Date(),
              isCurrentUser: data.senderId === userId,
            };
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error('Chat listener error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [jobId, userId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    setError('');
    const text = input;
    setInput(''); // optimistic clear — the live listener repaints from Firestore momentarily

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to send. Please try again.');
        setInput(text); // restore so they don't lose what they typed
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      setError('Failed to send. Please try again.');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-96 rounded-2xl overflow-hidden border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} title="Live" />
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {otherUserName}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-4)' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
              Start the conversation
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className="rounded-lg px-3 py-2 max-w-xs break-words text-sm"
                style={{
                  background: msg.isCurrentUser ? '#4f46e5' : 'var(--color-bg)',
                  color: msg.isCurrentUser ? 'white' : 'var(--color-text)',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs px-4 py-2" style={{ color: '#f87171' }}>⚠ {error}</p>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="input flex-1"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn btn-primary btn-sm px-3"
          style={{ padding: '0.625rem 0.75rem' }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
