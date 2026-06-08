'use client';

import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';

type Props = {
  status: VerificationStatus;
  licenseVerified?: boolean;
  insuranceVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

const CONFIG = {
  verified: {
    label: 'Verified Pro',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    icon: ShieldCheck,
  },
  pending: {
    label: 'Verification Pending',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.25)',
    icon: Clock,
  },
  rejected: {
    label: 'Docs Rejected',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.25)',
    icon: ShieldAlert,
  },
  expired: {
    label: 'Insurance Expired',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.25)',
    icon: ShieldAlert,
  },
  unverified: {
    label: 'Unverified',
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.10)',
    border: 'rgba(107,114,128,0.20)',
    icon: ShieldAlert,
  },
};

const SIZE = {
  sm: { icon: 11, font: 10, pad: '2px 7px', gap: 4, radius: 20 },
  md: { icon: 13, font: 12, pad: '4px 10px', gap: 5, radius: 20 },
  lg: { icon: 16, font: 14, pad: '7px 14px', gap: 6, radius: 12 },
};

export default function VerifiedBadge({
  status,
  licenseVerified,
  insuranceVerified,
  size = 'md',
  showLabel = true,
}: Props) {
  if (status === 'unverified') return null;

  const cfg = CONFIG[status] || CONFIG.unverified;
  const sz = SIZE[size];
  const Icon = cfg.icon;

  const tooltip =
    status === 'verified'
      ? `License${licenseVerified ? ' ✓' : ''} · Insurance${insuranceVerified ? ' ✓' : ''}`
      : cfg.label;

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sz.gap,
        padding: sz.pad,
        borderRadius: sz.radius,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: sz.font,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <Icon size={sz.icon} />
      {showLabel && cfg.label}
    </span>
  );
}
