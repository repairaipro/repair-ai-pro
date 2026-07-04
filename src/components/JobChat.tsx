'use client';

import { useState, useEffect, useRef } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, [jobId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.messages.map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
            isCurrentUser: m.senderId === userId,
          }))
        );
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      if (res.ok) {
        setInput('');
        await fetchMessages();
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-96 rounded-2xl overflow-hidden border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
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
