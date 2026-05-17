'use client';

import { motion } from 'framer-motion';
import { useState, ReactNode } from 'react';

interface Tab {
  label: string;
  value: string;
  content: ReactNode;
  icon?: ReactNode;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: 'default' | 'pill' | 'underline';
}

export function AnimatedTabs({
  tabs,
  defaultValue,
  onChange,
  variant = 'default',
}: AnimatedTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue || tabs[0]?.value || '');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onChange?.(value);
  };

  const activeTabIndex = tabs.findIndex((t) => t.value === activeTab);

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div
        className={`flex gap-2 ${
          variant === 'pill' ? 'bg-[var(--color-surface)] p-1 rounded-lg' : ''
        } ${variant === 'underline' ? 'border-b border-[var(--color-border)]' : ''}`}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`relative px-4 py-2.5 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === tab.value
                ? 'text-white'
                : 'text-[var(--color-text-3)] hover:text-[var(--color-text)]'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Background for pill variant */}
            {variant === 'pill' && activeTab === tab.value && (
              <motion.div
                className="absolute inset-0 rounded-md"
                layoutId="pill-bg"
                style={{
                  background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
              />
            )}

            {/* Icon */}
            {tab.icon && <span className="relative z-10">{tab.icon}</span>}

            {/* Label */}
            <span className="relative z-10">{tab.label}</span>

            {/* Underline for underline variant */}
            {variant === 'underline' && activeTab === tab.value && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"
                layoutId="underline-bg"
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{
          duration: 0.2,
        }}
      >
        {tabs.find((t) => t.value === activeTab)?.content}
      </motion.div>
    </div>
  );
}
