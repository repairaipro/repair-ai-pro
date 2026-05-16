'use client';

import { useState } from 'react';
import { Copy, Share2, Gift } from 'lucide-react';

interface ReferralCardProps {
  referralLink: string;
  rewardAmount: number;
  referralType: 'contractor' | 'homeowner';
  successfulReferrals?: number;
}

export function ReferralCard({
  referralLink,
  rewardAmount,
  referralType,
  successfulReferrals = 0,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rewardText = referralType === 'contractor'
    ? `Earn $${(rewardAmount / 100).toFixed(2)} when someone signs up`
    : `Get $${(rewardAmount / 100).toFixed(2)} credit toward your next job`;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(147,51,234,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#6366f1' }}
          >
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Referral Rewards
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              {successfulReferrals} successful {successfulReferrals === 1 ? 'referral' : 'referrals'}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--color-text-3)' }}>
        {rewardText}
      </p>

      {/* Link preview */}
      <div
        className="rounded-lg p-3 mb-3 flex items-center justify-between"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-xs truncate" style={{ color: 'var(--color-text-4)' }}>
          {referralLink}
        </p>
        <button
          onClick={handleCopy}
          className="ml-2 p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{
            background: copied ? '#22c55e' : 'var(--color-surface-2)',
            color: copied ? '#fff' : 'var(--color-text-3)',
          }}
          title={copied ? 'Copied!' : 'Copy link'}
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const text = `Join repair-ai and ${referralType === 'contractor' ? 'earn money' : 'get discounts'} with my referral link: ${referralLink}`;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
          }}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: '#1DA1F2',
            color: '#fff',
          }}
        >
          Share on X
        </button>
        <button
          onClick={() => {
            const text = `Join repair-ai and ${referralType === 'contractor' ? 'earn money' : 'get discounts'}: ${referralLink}`;
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`);
          }}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: '#1877F2',
            color: '#fff',
          }}
        >
          Share on Facebook
        </button>
        <button
          onClick={() => {
            const subject = `Join repair-ai with my referral link`;
            const body = `I'm using repair-ai for ${referralType === 'contractor' ? 'earning' : 'finding services'}. Use this link to join: ${referralLink}`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          }}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Share2 className="w-3 h-3 mx-auto" />
        </button>
      </div>
    </div>
  );
}
