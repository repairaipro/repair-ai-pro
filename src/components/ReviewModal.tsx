'use client';

import { useState } from 'react';
import { Star, X, Loader2, CheckCircle2, ThumbsUp } from 'lucide-react';

interface ReviewModalProps {
  jobId:        string;
  contractorId: string;
  reviewerId:   string;
  contractorName?: string;
  token:        string;
  onClose:      () => void;
  onSubmitted?: () => void;
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
const QUICK_PHRASES = [
  'Very professional',
  'On time and clean',
  'Great communication',
  'Fair price',
  'Would hire again',
  'Went above and beyond',
];

export function ReviewModal({
  jobId, contractorId, reviewerId, contractorName, token, onClose, onSubmitted,
}: ReviewModalProps) {
  const [rating,     setRating]     = useState(0);
  const [hover,      setHover]      = useState(0);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const displayRating = hover || rating;

  async function handleSubmit() {
    if (rating === 0) { setError('Please select a star rating'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/submit-review`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contractorId, reviewerId, rating, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit review');
      setDone(true);
      onSubmitted?.();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function addPhrase(phrase: string) {
    setText((prev) => {
      if (prev.includes(phrase)) return prev;
      return prev ? `${prev}. ${phrase}` : phrase;
    });
  }

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        padding: '0 0 0',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet */}
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--color-surface)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 24px 36px',
          border: '1px solid var(--color-border)',
          borderBottom: 'none',
          position: 'relative',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--color-border)',
          margin: '0 auto 20px',
        }} />

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '4px 8px',
            color: 'var(--color-text-4)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          <X size={15} />
        </button>

        {done ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34,197,94,0.12)',
              border: '2px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} />
            </div>
            <h3 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
              Review Submitted! 🎉
            </h3>
            <p style={{ color: 'var(--color-text-4)', fontSize: 14, marginBottom: 24 }}>
              Your review helps other homeowners find great contractors.
              {contractorName ? ` Thanks for rating ${contractorName}!` : ''}
            </p>
            <div style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            }}>
              <ThumbsUp size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
                {rating >= 4
                  ? 'Excellent! High ratings help trusted pros get more work.'
                  : 'Your honest feedback helps improve the platform for everyone.'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px 0',
                background: 'var(--color-brand)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Review form ── */
          <>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                How was your experience?
              </h3>
              <p style={{ color: 'var(--color-text-4)', fontSize: 13 }}>
                {contractorName
                  ? `Rate ${contractorName} on this job`
                  : 'Rate your contractor for this job'}
              </p>
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    transition: 'transform 0.1s',
                    transform: displayRating >= n ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  <Star
                    size={38}
                    fill={displayRating >= n ? '#fbbf24' : 'none'}
                    stroke={displayRating >= n ? '#fbbf24' : 'var(--color-border)'}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            {/* Rating label */}
            <p style={{
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: displayRating ? '#fbbf24' : 'var(--color-text-4)',
              marginBottom: 20,
              minHeight: 20,
              transition: 'color 0.15s',
            }}>
              {displayRating ? RATING_LABELS[displayRating] : 'Tap to rate'}
            </p>

            {/* Quick phrases */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Quick add
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_PHRASES.map((phrase) => {
                  const selected = text.includes(phrase);
                  return (
                    <button
                      key={phrase}
                      onClick={() => addPhrase(phrase)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        background: selected
                          ? 'rgba(99,102,241,0.15)'
                          : 'var(--color-surface-2)',
                        color: selected ? '#818cf8' : 'var(--color-text-3)',
                        border: `1px solid ${selected ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
                      }}
                    >
                      {selected ? '✓ ' : '+ '}{phrase}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text area */}
            <textarea
              rows={3}
              placeholder="Share more details about your experience (optional)…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                color: 'var(--color-text)',
                fontSize: 13,
                lineHeight: 1.5,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />

            {/* Error */}
            {error && (
              <p style={{ fontSize: 12, color: 'var(--color-error)', marginBottom: 10, fontWeight: 500 }}>
                ⚠️ {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              style={{
                width: '100%',
                padding: '13px 0',
                background: rating > 0 ? 'var(--color-brand)' : 'var(--color-surface-2)',
                color: rating > 0 ? '#fff' : 'var(--color-text-4)',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: rating > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s',
              }}
            >
              {submitting
                ? <><Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} /> Submitting…</>
                : <><Star size={16} /> Submit Review</>}
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                marginTop: 10,
                padding: '10px 0',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-4)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Skip for now
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
