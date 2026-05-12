'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, DollarSign, Star, Briefcase } from 'lucide-react';

/* ── Types ── */
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'money' | 'bid' | 'review';

export interface Toast {
  id:       string;
  type:     ToastType;
  title:    string;
  body?:    string;
  href?:    string;
  duration?: number; // ms — 0 = persistent
}

interface ToastCtx {
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

/* ── Context ── */
const ToastContext = createContext<ToastCtx>({
  addToast:    () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/* ── Config ── */
const TYPE_CONFIG: Record<ToastType, { icon: React.ReactNode; bg: string; accent: string }> = {
  success: { icon: <CheckCircle2 size={18} />, bg: 'rgba(34,197,94,0.10)',  accent: '#22c55e' },
  error:   { icon: <AlertTriangle size={18} />, bg: 'rgba(239,68,68,0.10)', accent: '#ef4444' },
  warning: { icon: <AlertTriangle size={18} />, bg: 'rgba(245,158,11,0.10)', accent: '#f59e0b' },
  info:    { icon: <Info size={18} />,           bg: 'rgba(99,102,241,0.10)', accent: '#818cf8' },
  money:   { icon: <DollarSign size={18} />,     bg: 'rgba(34,197,94,0.10)',  accent: '#22c55e' },
  bid:     { icon: <Briefcase size={18} />,      bg: 'rgba(99,102,241,0.10)', accent: '#818cf8' },
  review:  { icon: <Star size={18} />,           bg: 'rgba(245,158,11,0.10)', accent: '#f59e0b' },
};

/* ── Single toast ── */
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const cfg = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.info;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast.duration && toast.duration !== 0) return;
    if (toast.duration === 0) return; // persistent
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration);
    return () => clearTimeout(t);
  }, [toast.duration, toast.id, onRemove]);

  function handleClose(e: React.MouseEvent) {
    e.preventDefault();
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  }

  const inner = (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        background: 'var(--color-surface)',
        border: `1px solid ${cfg.accent}35`,
        borderLeft: `3px solid ${cfg.accent}`,
        borderRadius: 14,
        padding: '12px 14px 12px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxWidth: 360,
        width: '100%',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.95)',
        opacity: visible ? 1 : 0,
        cursor: toast.href ? 'pointer' : 'default',
      }}
    >
      {/* Icon */}
      <div style={{ color: cfg.accent, flexShrink: 0, marginTop: 1 }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: 'var(--color-text)',
          fontWeight: 600,
          fontSize: 14,
          lineHeight: 1.4,
          marginBottom: toast.body ? 3 : 0,
        }}>
          {toast.title}
        </p>
        {toast.body && (
          <p style={{
            color: 'var(--color-text-4)',
            fontSize: 12,
            lineHeight: 1.4,
          }}>
            {toast.body}
          </p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-4)',
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 6,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );

  if (toast.href) {
    return (
      <a href={toast.href} style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </a>
    );
  }
  return inner;
}

/* ── Provider ── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${++counter.current}`;
    const duration = t.duration !== undefined ? t.duration : 5000;
    setToasts((prev) => [...prev.slice(-4), { ...t, id, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast container — bottom-right on desktop, bottom on mobile */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 80, // above mobile bottom nav
          right: 16,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
