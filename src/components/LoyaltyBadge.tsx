'use client';

import { Crown, Zap } from 'lucide-react';

type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface LoyaltyBadgeProps {
  tier: LoyaltyTier;
  feeDiscount: number;
  progressToNextTier?: number;
  nextTier?: LoyaltyTier;
}

const TIER_CONFIG: Record<LoyaltyTier, { label: string; color: string; icon: string }> = {
  bronze: { label: 'Bronze', color: '#92400e', icon: '🥉' },
  silver: { label: 'Silver', color: '#64748b', icon: '🥈' },
  gold: { label: 'Gold', color: '#d97706', icon: '🥇' },
  platinum: { label: 'Platinum', color: '#06b6d4', icon: '👑' },
};

export function LoyaltyBadge({
  tier,
  feeDiscount,
  progressToNextTier = 0,
  nextTier,
}: LoyaltyBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: config.color }}>
              {config.label} Tier
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              {feeDiscount}% fee discount
            </p>
          </div>
        </div>
        <Crown className="w-5 h-5" style={{ color: config.color }} />
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              Progress to {TIER_CONFIG[nextTier].label}
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-3)' }}>
              {progressToNextTier}%
            </p>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${progressToNextTier}%`,
                background: `linear-gradient(90deg, ${config.color}, ${TIER_CONFIG[nextTier].color})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Benefits section */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4" style={{ color: config.color }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
            Tier Benefits
          </p>
        </div>
        <ul className="space-y-1">
          <li className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            ✓ {feeDiscount}% platform fee reduction
          </li>
          <li className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            ✓ Priority job matching
          </li>
          <li className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            ✓ Featured profile badge
          </li>
          {tier === 'platinum' && (
            <li className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              ✓ Dedicated account manager
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
