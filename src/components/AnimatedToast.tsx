'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface AnimatedToastProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: Check,
    bgColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.2)',
    textColor: '#10b981',
    iconColor: '#10b981',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.2)',
    textColor: '#ef4444',
    iconColor: '#ef4444',
  },
  info: {
    icon: Info,
    bgColor: 'rgba(96,165,250,0.1)',
    borderColor: 'rgba(96,165,250,0.2)',
    textColor: '#60a5fa',
    iconColor: '#60a5fa',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.2)',
    textColor: '#fbbf24',
    iconColor: '#fbbf24',
  },
};

export function AnimatedToastContainer({
  toasts,
  onRemove,
}: AnimatedToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, i) => (
          <SingleToast
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
            index={i}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function SingleToast({
  toast,
  onRemove,
  index,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
  index: number;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    if (!toast.duration || toast.duration === Infinity) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 100, x: 100 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -100, x: 100 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className="pointer-events-auto"
    >
      <motion.div
        className="flex items-center gap-3 rounded-lg px-4 py-3 border"
        style={{
          background: config.bgColor,
          borderColor: config.borderColor,
        }}
        whileHover={{ scale: 1.02 }}
        onHoverStart={() => setIsExiting(false)}
      >
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: config.iconColor }} />
        <p style={{ color: config.textColor }} className="text-sm font-medium">
          {toast.message}
        </p>
        <motion.button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onRemove(toast.id), 300);
          }}
          className="ml-2 p-1 hover:opacity-70 transition-opacity"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="w-4 h-4" style={{ color: config.iconColor }} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// Hook for using toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (
    message: string,
    type: ToastType = 'info',
    duration = 4000
  ) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    addToast,
    removeToast,
    success: (msg: string, duration?: number) => addToast(msg, 'success', duration),
    error: (msg: string, duration?: number) => addToast(msg, 'error', duration),
    info: (msg: string, duration?: number) => addToast(msg, 'info', duration),
    warning: (msg: string, duration?: number) => addToast(msg, 'warning', duration),
  };
}
