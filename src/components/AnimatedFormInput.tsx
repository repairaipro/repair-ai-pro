'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface AnimatedFormInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  icon?: React.ReactNode;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function AnimatedFormInput({
  placeholder,
  value,
  onChange,
  type = 'text',
  icon,
  label,
  error,
  disabled = false,
  className = '',
}: AnimatedFormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <motion.label
          className="text-sm font-medium"
          style={{ color: 'var(--color-text)' }}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: isFocused ? 1 : 0.7 }}
        >
          {label}
        </motion.label>
      )}

      <motion.div
        className="relative"
        animate={{
          borderColor: isFocused
            ? 'rgba(99,102,241,0.5)'
            : error
              ? 'rgba(239,68,68,0.3)'
              : 'var(--color-border)',
        }}
        transition={{ duration: 0.2 }}
      >
        {icon && (
          <motion.div
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center"
            animate={{
              color: isFocused ? '#818cf8' : 'var(--color-text-4)',
              scale: isFocused ? 1.1 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        )}

        <motion.input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={`input w-full ${icon ? 'pl-9' : ''} ${className}`}
          style={{
            borderColor: isFocused
              ? 'rgba(99,102,241,0.5)'
              : error
                ? 'rgba(239,68,68,0.3)'
                : 'var(--color-border)',
            transition: 'border-color 0.2s ease',
          }}
          whileFocus={{
            boxShadow: '0 0 0 3px rgba(99,102,241,0.1)',
          }}
        />
      </motion.div>

      {error && (
        <motion.p
          className="text-xs"
          style={{ color: '#ef4444' }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

interface AnimatedFormSelectProps {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function AnimatedFormSelect({
  options,
  value,
  onChange,
  label,
  icon,
  disabled = false,
  className = '',
}: AnimatedFormSelectProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <motion.label
          className="text-sm font-medium"
          style={{ color: 'var(--color-text)' }}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: isFocused ? 1 : 0.7 }}
        >
          {label}
        </motion.label>
      )}

      <motion.div
        className="relative"
        animate={{
          borderColor: isFocused
            ? 'rgba(99,102,241,0.5)'
            : 'var(--color-border)',
        }}
        transition={{ duration: 0.2 }}
      >
        {icon && (
          <motion.div
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none"
            animate={{
              color: isFocused ? '#818cf8' : 'var(--color-text-4)',
              scale: isFocused ? 1.1 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        )}

        <motion.select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={`input w-full appearance-none ${icon ? 'pl-9' : ''} ${className}`}
          style={{
            borderColor: isFocused
              ? 'rgba(99,102,241,0.5)'
              : 'var(--color-border)',
            paddingRight: '2.5rem',
            transition: 'border-color 0.2s ease',
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </motion.select>

        {/* Dropdown arrow */}
        <motion.div
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          animate={{
            color: isFocused ? '#818cf8' : 'var(--color-text-4)',
          }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

interface AnimatedTextAreaProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  rows?: number;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function AnimatedTextArea({
  placeholder,
  value,
  onChange,
  label,
  rows = 4,
  error,
  disabled = false,
  className = '',
}: AnimatedTextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <motion.label
          className="text-sm font-medium"
          style={{ color: 'var(--color-text)' }}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: isFocused ? 1 : 0.7 }}
        >
          {label}
        </motion.label>
      )}

      <motion.textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        rows={rows}
        className={`input w-full resize-none ${className}`}
        style={{
          borderColor: isFocused
            ? 'rgba(99,102,241,0.5)'
            : error
              ? 'rgba(239,68,68,0.3)'
              : 'var(--color-border)',
          transition: 'border-color 0.2s ease',
        }}
        whileFocus={{
          boxShadow: '0 0 0 3px rgba(99,102,241,0.1)',
        }}
      />

      {error && (
        <motion.p
          className="text-xs"
          style={{ color: '#ef4444' }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
