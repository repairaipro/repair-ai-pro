'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
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

/* ── Pill button (shared) ────────────────────────────────────────────── */
function Pill({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 20,
        fontSize: 13,
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
              padding: '10px',
              borderRadius: 10,
              fontSize: 14,
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
  question, value, onChange,
}: { question: Question; value: any; onChange: (v: any) => void }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>
          {question.label}
          {question.required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
        </span>
        {question.description && (
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{question.description}</p>
        )}
        {question.followUp && (
          <p style={{ fontSize: 11, color: '#818cf8', marginTop: 2 }}>ℹ️ {question.followUp}</p>
        )}
      </div>

      {/* single-select */}
      {question.type === 'single-select' && question.options && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {question.options.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            />
          ))}
        </div>
      )}

      {/* multi-select */}
      {question.type === 'multi-select' && question.options && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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

      {/* yes-no */}
      {question.type === 'yes-no' && (
        <YesNo value={value} onChange={onChange} />
      )}

      {/* short-text */}
      {question.type === 'short-text' && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.description ?? 'Your answer…'}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: '#e5e7eb',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* number */}
      {question.type === 'number' && (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: '#e5e7eb',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function TradeQuestionnaire({
  questions, answers, onChange, onSubmit, loading, submitted, tradeName,
}: Props) {
  // Count answered required questions
  const requiredQs    = questions.filter((q) => q.required);
  const answeredReqQs = requiredQs.filter((q) => q.id in answers && answers[q.id] !== '' && answers[q.id] !== undefined);
  const allRequiredAnswered = answeredReqQs.length === requiredQs.length;
  const totalAnswered = questions.filter((q) => q.id in answers).length;

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
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <ClipboardList size={18} color="#818cf8" />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>
            {tradeName ? `${tradeName} ` : ''}Quick Questions
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
            Takes ~60 seconds · Unlocks a data-driven estimate
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
          }}
        >
          {answeredReqQs.length}/{requiredQs.length} required
        </div>
      </div>

      {/* Questions */}
      <div style={{ padding: '20px 20px 0' }}>
        {questions.map((q) => (
          <QuestionBlock
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(v) => onChange(q.id, v)}
          />
        ))}
      </div>

      {/* Submit */}
      <div style={{ padding: '8px 20px 20px' }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!allRequiredAnswered || loading}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 12,
            border: 'none',
            background: allRequiredAnswered && !loading
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'rgba(255,255,255,0.08)',
            color: allRequiredAnswered && !loading ? '#fff' : '#4b5563',
            fontSize: 15,
            fontWeight: 700,
            cursor: allRequiredAnswered && !loading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Getting precise estimate…</>
          ) : (
            <><ClipboardList size={16} /> Get Smart Estimate</>
          )}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#4b5563', marginTop: 8 }}>
          Based on real pricing data from similar jobs in your area
        </p>
      </div>
    </div>
  );
}
