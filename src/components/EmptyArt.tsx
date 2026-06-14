'use client';

/**
 * Friendly custom SVG illustrations for empty states — replaces generic
 * single-icon placeholders with branded art. Pick a variant by context.
 */
export default function EmptyArt({ variant = 'feed', size = 120 }: { variant?: 'feed' | 'jobs' | 'inbox'; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="eaBrand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* soft platter */}
      <ellipse cx="60" cy="98" rx="42" ry="8" fill="url(#eaBrand)" opacity="0.10" />

      {variant === 'feed' && (
        <g>
          {/* camera body */}
          <rect x="30" y="44" width="60" height="44" rx="10" fill="var(--color-surface)" stroke="url(#eaBrand)" strokeWidth="2" />
          <rect x="48" y="36" width="24" height="12" rx="4" fill="var(--color-surface)" stroke="url(#eaBrand)" strokeWidth="2" />
          <circle cx="60" cy="66" r="13" fill="rgba(99,102,241,0.12)" stroke="url(#eaBrand)" strokeWidth="2" />
          <circle cx="60" cy="66" r="5" fill="url(#eaBrand)" />
          {/* sparkles */}
          <path d="M92 40 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#fbbf24">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          </path>
          <circle cx="28" cy="52" r="2.5" fill="#34d399">
            <animate attributeName="opacity" values="1;0.3;1" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {variant === 'jobs' && (
        <g>
          <rect x="34" y="40" width="52" height="48" rx="9" fill="var(--color-surface)" stroke="url(#eaBrand)" strokeWidth="2" />
          <rect x="46" y="34" width="28" height="10" rx="4" fill="var(--color-surface)" stroke="url(#eaBrand)" strokeWidth="2" />
          <rect x="44" y="56" width="32" height="5" rx="2.5" fill="var(--color-surface-2)" />
          <rect x="44" y="68" width="22" height="5" rx="2.5" fill="var(--color-surface-2)" />
          <path d="M78 78 l4 4 l8 -9" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}

      {variant === 'inbox' && (
        <g>
          <rect x="30" y="46" width="60" height="42" rx="9" fill="var(--color-surface)" stroke="url(#eaBrand)" strokeWidth="2" />
          <path d="M32 50 l28 20 l28 -20" stroke="url(#eaBrand)" strokeWidth="2" fill="none" />
        </g>
      )}
    </svg>
  );
}
