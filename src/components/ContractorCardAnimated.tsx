'use client';

import { motion } from 'framer-motion';
import { Star, MapPin, Award } from 'lucide-react';
import Link from 'next/link';

interface ContractorCardAnimatedProps {
  id: string;
  name: string;
  trade: string;
  rating: number;
  reviewCount: number;
  location: string;
  responseTime: string;
  image?: string;
  verified?: boolean;
  index?: number;
  featured?: boolean;
}

export function ContractorCardAnimated({
  id,
  name,
  trade,
  rating,
  reviewCount,
  location,
  responseTime,
  image,
  verified = false,
  index = 0,
  featured = false,
}: ContractorCardAnimatedProps) {
  return (
    <Link href={`/contractor/${id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -4, scale: 1.02 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
          delay: index * 0.05,
        }}
        className="card overflow-hidden group cursor-pointer relative"
      >
        {/* Background glow on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: featured
              ? 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.02) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-4 flex flex-col h-full">
          {/* Image or Avatar */}
          <motion.div
            className="w-full h-40 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 mb-4 overflow-hidden flex items-center justify-center text-5xl"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {image ? (
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>👨‍🔧</span>
            )}
          </motion.div>

          {/* Header with badge */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-sm truncate"
                style={{ color: 'var(--color-text)' }}
              >
                {name}
              </h3>
              <p
                className="text-xs truncate"
                style={{ color: 'var(--color-text-4)' }}
              >
                {trade}
              </p>
            </div>
            {verified && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Award
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: '#818cf8' }}
                />
              </motion.div>
            )}
          </div>

          {/* Rating */}
          <motion.div
            className="flex items-center gap-1 mb-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3 }}
                  whileInView={{
                    opacity: i < Math.round(rating) ? 1 : 0.3,
                  }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Star
                    className="w-3.5 h-3.5 fill-current"
                    style={{
                      color:
                        i < Math.round(rating) ? '#fbbf24' : '#9ca3af',
                    }}
                  />
                </motion.div>
              ))}
            </div>
            <span
              className="text-xs font-medium ml-1"
              style={{ color: 'var(--color-text-4)' }}
            >
              {rating.toFixed(1)}
              <span style={{ color: 'var(--color-text-4)' }}> ({reviewCount})</span>
            </span>
          </motion.div>

          {/* Location */}
          <motion.div
            className="flex items-center gap-1 text-xs mb-3"
            style={{ color: 'var(--color-text-4)' }}
            whileHover={{ x: 2 }}
          >
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </motion.div>

          {/* Response time */}
          <motion.div
            className="mt-auto pt-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              Responds in{' '}
              <span style={{ color: 'var(--color-success)' }} className="font-semibold">
                {responseTime}
              </span>
            </div>
          </motion.div>

          {/* Hover CTA */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            whileHover={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 text-center text-xs font-semibold"
            style={{
              color: '#818cf8',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            View Profile →
          </motion.div>
        </div>

        {/* Featured badge */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="absolute top-2 left-2 z-20 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
              color: '#fff',
            }}
          >
            ⭐ Featured
          </motion.div>
        )}
      </motion.div>
    </Link>
  );
}
