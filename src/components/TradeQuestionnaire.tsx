'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, ClipboardList, ChevronLeft, ArrowRight } from 'lucide-react';
import type { Question } from '@/lib/tradeQuestionnaires';

type Props = {
  questions: Question[];
  answers: Record<string, any>;
  onChange: (id: string, value: any) => void;
  onSubmit: () => void;
  loading?: boolean;
  submitted?: boolean;
  tradeName?: string;
};

function isAnswered(q: Question, answers: Record<string, any>): boolean {
  const v = answers[q.id];
  if (q.type === 'multi-select') return Array.isArray(v) && v.length > 0;
  return v !== undefined && v !== '';
}

/* ── Pill button (shared) ────────────────────────────────────────────── */
function Pill({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 16px',
        borderRadius: 20,
        fontSize: 14,
        fontWeight: selected ? 700 : 500,
        border: selected ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
        background: selected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
        color: selected ? '#a5b4fc' : '#9ca3af',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {selected && <span style={{ marginRight: 5 }}>✓</span>}
      {label}
    </button>
  );
}

/* ── Yes/No buttons ──────────────────────────────────────────────────── */
function YesNo({
  value, onChange,
}: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {[
        { label: 'Yes', val: true,  color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)' },
        { label: 'No',  val: false, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
      ].map(({ label, val, color, bg, border }) => {
        const sel = value === val;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(val)}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: sel ? 700 : 500,
              border: sel ? `1.5px solid ${border}` : '1px solid rgba(255,255,255,0.1)',
              background: sel ? bg : 'rgba(255,255,255,0.04)',
              color: sel ? color : '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {sel && '✓ '}{label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Single question renderer ────────────────────────────────────────── */
function QuestionBlock({
  question, value, onChange, onAutoAdvance, onForceAdvance,
}: { question: Question; value: any; onChange: (v: any) => void; onAutoAdvance: () => void; onForceAdvance: () => void }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#e5e7eb' }}>
          {question.label}
          {question.required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
        </span>
        {question.description && (
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{question.description}</p>
        )}
        {question.followUp && (
          <p style={{ fontSize: 12, color: '#818cf8', marginTop: 4 }}>ℹ️ {question.followUp}</p>
        )}
      </div>

      {/* single-select — clicking an option auto-advances */}
      {question.type === 'single-select' && question.options && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {question.options.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={value === opt.value}
              onClick={() => { onChange(opt.value); onForceAdvance(); }}
            />
          ))}
        </div>
      )}

      {/* multi-select — no auto-advance, user picks several then hits Next */}
      {question.type === 'multi-select' && question.options && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {question.options.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt.value);
            return (
              <Pill
                key={opt.value}
                label={opt.label}
                selected={selected}
                onClick={() => {
                  const current: string[] = Array.isArray(value) ? value : [];
                  onChange(
                    selected
                      ? current.filter((v) => v !== opt.value)
                      : [...current, opt.value]
                  );
                }}
              />
            );
          })}
        </div>
      )}

      {/* yes-no — auto-advances */}
      {question.type === 'yes-no' && (
        <YesNo value={value} onChange={(v) => { onChange(v); onForceAdvance(); }} />
      )}

      {/* short-text */}
      {question.type === 'short-text' && (
        <input
          type="text"
          autoFocus
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAutoAdvance(); }}
          placeholder={question.description ?? 'Your answer…'}
          style={{
            width: '100%',
            padding: '13px 16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: '#e5e7eb',
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* number */}
      {question.type === 'number' && (
        <input
          type="number"
          autoFocus
          value={value ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter') onAutoAdvance(); }}
          style={{
            width: '100%',
            padding: '13px 16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: '#e5e7eb',
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
}

/* ── Main component — one question at a time ─────────────────────────── */
export default function TradeQuestionnaire({
  questions, answers, onChange, onSubmit, loading, submitted, tradeName,
}: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const requiredQs    = questions.filter((q) => q.required);
  const answeredReqQs = requiredQs.filter((q) => isAnswered(q, answers));
  const totalAnswered = questions.filter((q) => isAnswered(q, answers)).length;

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 14,
        }}
      >
        <CheckCircle size={20} color="#34d399" />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: 0 }}>
            Questionnaire complete
          </p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
            {totalAnswered} of {questions.length} questions answered — your estimate has been refined
          </p>
        </div>
      </motion.div>
    );
  }

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const currentAnswered = isAnswered(current, answers);
  const canAdvance = !current.required || currentAnswered;

  function goTo(next: number) {
    setDirection(next > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(questions.length - 1, next)));
  }

  function handleNext() {
    if (!canAdvance) return;
    if (isLast) {
      onSubmit();
    } else {
      goTo(index + 1);
    }
  }

  /** Used right after selecting a single-select/yes-no option: the click just supplied
   * the answer, so the required-check (gated on state that hasn't committed yet) doesn't
   * need to run — advancing is always valid. */
  function handleForceAdvance() {
    if (isLast) {
      onSubmit();
    } else {
      goTo(index + 1);
    }
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          background: 'rgba(99,102,241,0.08)',
          borderBottom: '1px solid rgba(99,102,241,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <ClipboardList size={18} color="#818cf8" />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>
              {tradeName ? `${tradeName} ` : ''}Quick Questions
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
              Question {index + 1} of {questions.length} · Unlocks a data-driven estimate
            </p>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 20,
              background: answeredReqQs.length === requiredQs.length
                ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
              color: answeredReqQs.length === requiredQs.length ? '#34d399' : '#6b7280',
              flexShrink: 0,
            }}
          >
            {answeredReqQs.length}/{requiredQs.length} required
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 4,
              width: `${((index + 1) / questions.length) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>
      </div>

      {/* Current question, animated */}
      <div style={{ padding: '24px 20px', minHeight: 140, position: 'relative', overflow: 'hidden' }}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
        >
          <QuestionBlock
            question={current}
            value={answers[current.id]}
            onChange={(v) => onChange(current.id, v)}
            onAutoAdvance={handleNext}
            onForceAdvance={handleForceAdvance}
          />
        </motion.div>
      </div>

      {/* Nav */}
      <div style={{ padding: '8px 20px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
        {index > 0 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            style={{
              padding: '13px 16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#9ca3af',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}

        {!current.required && !currentAnswered && !isLast && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            style={{
              padding: '13px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'transparent',
              color: '#6b7280',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance || loading}
          style={{
            flex: 1,
            padding: '13px',
            borderRadius: 12,
            border: 'none',
            background: canAdvance && !loading
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'rgba(255,255,255,0.08)',
            color: canAdvance && !loading ? '#fff' : '#4b5563',
            fontSize: 15,
            fontWeight: 700,
            cursor: canAdvance && !loading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Getting precise estimate…</>
          ) : isLast ? (
            <><ClipboardList size={16} /> Get Smart Estimate</>
          ) : (
            <>Next <ArrowRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}
