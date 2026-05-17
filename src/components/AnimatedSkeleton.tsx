'use client';

import { motion } from 'framer-motion';

export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`bg-gradient-to-r from-transparent via-white to-transparent ${className}`}
      animate={{ backgroundPosition: ['0% 0%', '100% 0%'] }}
      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      style={{
        backgroundSize: '200% 100%',
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <SkeletonPulse className="h-40 rounded-lg" />
      <SkeletonPulse className="h-4 w-1/2 rounded" />
      <SkeletonPulse className="h-3 w-full rounded" />
      <SkeletonPulse className="h-3 w-2/3 rounded" />
      <div className="flex gap-2 pt-2">
        <SkeletonPulse className="h-6 w-20 rounded-full" />
        <SkeletonPulse className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function ContractorCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <SkeletonPulse className="h-40 rounded-lg" />
      <div className="space-y-2">
        <SkeletonPulse className="h-4 w-3/4 rounded" />
        <SkeletonPulse className="h-3 w-1/2 rounded" />
      </div>
      <SkeletonPulse className="h-4 w-full rounded" />
      <div className="flex gap-1 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-3 w-3 rounded-full" />
        ))}
      </div>
      <SkeletonPulse className="h-8 w-full rounded-lg mt-3" />
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <SkeletonPulse className="h-36 rounded-xl" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <SkeletonPulse className="h-4 w-2/3 rounded" />
          <SkeletonPulse className="h-5 w-20 rounded-full" />
        </div>
        <SkeletonPulse className="h-3 w-full rounded" />
        <SkeletonPulse className="h-3 w-3/4 rounded" />
      </div>
      <div className="flex items-center gap-1 pt-1">
        <SkeletonPulse className="h-3 w-3 rounded-full" />
        <SkeletonPulse className="h-3 w-24 rounded" />
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonPulse className="h-32 w-32 rounded-2xl" />
      <div className="space-y-2">
        <SkeletonPulse className="h-6 w-1/2 rounded" />
        <SkeletonPulse className="h-4 w-1/3 rounded" />
      </div>
      <div className="flex gap-2">
        <SkeletonPulse className="h-8 w-24 rounded-lg" />
        <SkeletonPulse className="h-8 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function GridSkeletonLoader({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="flex gap-3">
            <SkeletonPulse className="h-16 w-16 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonPulse className="h-4 w-2/3 rounded" />
              <SkeletonPulse className="h-3 w-full rounded" />
              <SkeletonPulse className="h-3 w-3/4 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
