'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl';
}

export function PageLayout({
  children,
  className = '',
  maxWidth = 'lg',
}: PageLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  };

  return (
    <motion.div
      className="min-h-screen"
      style={{ background: 'var(--color-bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 py-8 ${className}`}>
        {children}
      </div>
    </motion.div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

export function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <motion.div
      className="mb-8 flex items-start justify-between gap-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ color: 'var(--color-text-3)' }} className="text-base">
            {description}
          </p>
        )}
      </div>
      {action && (
        <motion.button
          onClick={action.onClick}
          className="btn btn-primary flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
