'use client';

import { Shield, MapPin, EyeOff, Navigation } from 'lucide-react';

export type LocationPrivacyMode =
  | 'full'
  | 'address_hidden_until_arrival'
  | 'zip_only'
  | 'approximate';

export const PRIVACY_OPTIONS: {
  value: LocationPrivacyMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
}[] = [
  {
    value: 'full',
    label: 'Full address',
    description: 'Contractors see your complete street address immediately.',
    icon: <MapPin size={18} />,
    accentColor: '#34d399',
  },
  {
    value: 'approximate',
    label: 'Neighborhood only',
    description: 'Show city & zip — exact street hidden until you accept a contractor.',
    icon: <Navigation size={18} />,
    accentColor: '#818cf8',
  },
  {
    value: 'address_hidden_until_arrival',
    label: 'Hidden until arrival',
    description: 'Full address revealed only when the contractor is on the way.',
    icon: <EyeOff size={18} />,
    accentColor: '#fbbf24',
  },
  {
    value: 'zip_only',
    label: 'ZIP code only',
    description: 'Only your ZIP code is visible. Best for browsing quotes anonymously.',
    icon: <Shield size={18} />,
    accentColor: '#f87171',
  },
];

interface Props {
  value: LocationPrivacyMode;
  onChange: (mode: LocationPrivacyMode) => void;
}

export default function LocationPrivacySettings({ value, onChange }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Shield size={16} color="#818cf8" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)' }}>
          Location privacy
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PRIVACY_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: active
                  ? `1.5px solid ${opt.accentColor}55`
                  : '1px solid var(--color-border)',
                background: active
                  ? `${opt.accentColor}11`
                  : 'var(--color-surface-2)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  marginBottom: 6,
                  color: active ? opt.accentColor : 'var(--color-text-3)',
                }}
              >
                {opt.icon}
                <span style={{ fontSize: 13, fontWeight: 700, color: active ? opt.accentColor : 'var(--color-text-2)' }}>
                  {opt.label}
                </span>
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--color-text-4)', margin: 0 }}>
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>

      {value !== 'full' && (
        <p
          style={{
            fontSize: 11,
            color: '#fbbf24',
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Shield size={11} />
          Your privacy setting is visible to you only — contractors see a filtered location until you allow more.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Helper: apply the privacy filter to a location object before displaying
 * it to a contractor.  Call this on the CLIENT side when rendering job cards
 * or the job detail page for a non-owner.
 * ───────────────────────────────────────────────────────────────────────────*/

export type JobLocation = {
  address?:     string;
  city?:        string;
  state?:       string;
  zipcode?:     string;
  coordinates?: { lat: number; lng: number };
};

/**
 * Returns a filtered copy of `location` suitable for display to a contractor,
 * respecting the job's `locationPrivacyMode`.
 *
 * @param location         The full location stored on the job.
 * @param privacyMode      The job's privacy setting.
 * @param contractorIsClaimed  True once the homeowner has accepted the contractor.
 */
export function applyLocationPrivacy(
  location: JobLocation,
  privacyMode: LocationPrivacyMode | undefined | null,
  contractorIsClaimed: boolean
): JobLocation {
  const mode = privacyMode ?? 'full';

  // Once the homeowner has accepted / the contractor is claimed, always show full.
  if (contractorIsClaimed) return location;

  switch (mode) {
    case 'full':
      return location;

    case 'approximate':
      // Show city + state + zip, hide street address and exact coordinates
      return {
        city:    location.city,
        state:   location.state,
        zipcode: location.zipcode,
      };

    case 'address_hidden_until_arrival':
      // Show neighborhood label and zip — coordinates hidden
      return {
        city:    location.city,
        state:   location.state,
        zipcode: location.zipcode,
      };

    case 'zip_only':
      return {
        zipcode: location.zipcode,
      };

    default:
      return location;
  }
}

/** Returns a human-readable location string for a (possibly filtered) location. */
export function formatLocation(location: JobLocation): string {
  if (location.address && location.city) {
    return `${location.address}, ${location.city}, ${location.state ?? ''} ${location.zipcode ?? ''}`.trim();
  }
  if (location.city) {
    return `${location.city}, ${location.state ?? ''} ${location.zipcode ?? ''}`.trim();
  }
  if (location.zipcode) {
    return `ZIP ${location.zipcode}`;
  }
  return 'Location hidden';
}
