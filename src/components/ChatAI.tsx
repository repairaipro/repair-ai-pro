
'use client';
import { useState } from 'react';

export default function ChatAI() {
  const [input, setInput] = useState('Describe the issue...');
  const [media, setMedia] = useState(''); // comma-separated URLs
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    setAnswer('');
    const res = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, media: media.split(',').map(s => s.trim()).filter(Boolean) })
    });
    const data = await res.json();
    setAnswer(data.answer || 'No response');
    setLoading(false);
  }

  return (
    <div className="card space-y-3">
      <label className="label">Describe problem</label>
      <textarea className="input h-24" value={input} onChange={e => setInput(e.target.value)} />
      <label className="label">Media URLs (from Cloudinary), comma-separated</label>
      <input className="input" value={media} onChange={e => setMedia(e.target.value)} placeholder="https://res.cloudinary.com/.../image.jpg, https://..." />
      <button className="btn btn-primary" onClick={ask} disabled={loading}>{loading ? 'Thinking...' : 'Ask AI'}</button>
      {answer && <pre className="whitespace-pre-wrap text-sm">{answer}</pre>}
    </div>
  );
}
