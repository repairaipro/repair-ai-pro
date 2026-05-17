'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
}

export function AnimatedModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeButton = true,
}: AnimatedModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`${sizeClasses[size]} card relative`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || closeButton) && (
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                  {title && (
                    <h2
                      className="font-semibold text-lg"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {title}
                    </h2>
                  )}
                  {closeButton && (
                    <motion.button
                      onClick={onClose}
                      className="ml-auto p-1 rounded-lg transition-colors hover:bg-[var(--color-surface)]"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X className="w-5 h-5" style={{ color: 'var(--color-text-4)' }} />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={title || closeButton ? 'pt-4' : ''}>{children}</div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface AnimatedSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: 'left' | 'right';
  closeButton?: boolean;
}

export function AnimatedSheet({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  closeButton = true,
}: AnimatedSheetProps) {
  const xOffset = side === 'right' ? 400 : -400;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={`fixed top-0 ${side}-0 h-full w-96 card border-0 rounded-0 z-50 flex flex-col`}
            initial={{ x: xOffset, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: xOffset, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          >
            {/* Header */}
            {(title || closeButton) && (
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                {title && (
                  <h2
                    className="font-semibold text-lg"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {title}
                  </h2>
                )}
                {closeButton && (
                  <motion.button
                    onClick={onClose}
                    className="ml-auto p-1 rounded-lg transition-colors hover:bg-[var(--color-surface)]"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-5 h-5" style={{ color: 'var(--color-text-4)' }} />
                  </motion.button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={`flex-1 overflow-y-auto ${title || closeButton ? 'pt-4' : ''}`}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
