'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedPricingCardProps {
  title: string;
  subtitle?: string;
  price: string | number;
  period?: string;
  features: string[];
  cta: {
    label: string;
    href: string;
  };
  highlight?: boolean;
  badge?: string;
  index?: number;
}

export function AnimatedPricingCard({
  title,
  subtitle,
  price,
  period = '/month',
  features,
  cta,
  highlight = false,
  badge,
  index = 0,
}: AnimatedPricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay: index * 0.1,
      }}
      className="relative group"
    >
      {/* Glow effect background */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: highlight
            ? 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Card */}
      <div
        className="card p-6 relative z-10 h-full flex flex-col"
        style={{
          background: highlight ? 'rgba(99,102,241,0.04)' : 'var(--color-surface)',
          border: highlight
            ? '1px solid rgba(99,102,241,0.4)'
            : '1px solid var(--color-border)',
          transition: 'border-color 0.3s ease',
        }}
        onMouseEnter={(e) => {
          if (highlight) {
            (e.currentTarget as HTMLElement).style.borderColor =
              'rgba(99,102,241,0.6)';
          }
        }}
        onMouseLeave={(e) => {
          if (highlight) {
            (e.currentTarget as HTMLElement).style.borderColor =
              'rgba(99,102,241,0.4)';
          }
        }}
      >
        {/* Badge */}
        {badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl"
            style={{ background: 'var(--color-brand)', color: '#fff' }}
          >
            {badge}
          </motion.div>
        )}

        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-4)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span
              className="text-4xl font-extrabold"
              style={{ color: 'var(--color-text)' }}
            >
              ${price}
            </span>
            {period && (
              <span style={{ color: 'var(--color-text-4)' }} className="text-sm">
                {period}
              </span>
            )}
          </div>
        </div>

        {/* Features */}
        <motion.ul className="space-y-3 mb-6 flex-1">
          {features.map((feature, i) => (
            <motion.li
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--color-text-3)' }}
            >
              <motion.svg
                className="w-4 h-4 flex-shrink-0"
                style={{
                  background: highlight ? '#818cf8' : 'var(--color-success)',
                  color: 'white',
                }}
                fill="currentColor"
                viewBox="0 0 20 20"
                whileHover={{ scale: 1.2, rotate: 360 }}
                transition={{ duration: 0.3 }}
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </motion.svg>
              {feature}
            </motion.li>
          ))}
        </motion.ul>

        {/* CTA Button */}
        <motion.a
          href={cta.href}
          className="btn w-full text-center transition-all duration-300 relative overflow-hidden"
          style={highlight ? {} : {}}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10">{cta.label}</span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
            initial={{ x: '-100%', opacity: 0 }}
            whileHover={{ x: '100%', opacity: 0.3 }}
            transition={{ duration: 0.6 }}
          />
        </motion.a>
      </div>
    </motion.div>
  );
}
