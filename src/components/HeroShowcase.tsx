'use client';

/**
 * Hero showcase illustration: the product story in one graphic —
 * a problem photo → AI diagnosis → matched verified pro. Pure inline SVG,
 * brand gradient, subtle motion. No image assets, scales crisply anywhere.
 */
export default function HeroShowcase() {
  return (
    <div className="w-full max-w-3xl mx-auto" aria-hidden>
      <svg viewBox="0 0 720 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <linearGradient id="hsBrand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="hsGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="hsGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Connector line with travelling dot */}
        <line x1="190" y1="130" x2="300" y2="130" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="4 5" />
        <line x1="420" y1="130" x2="530" y2="130" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="4 5" />
        <circle r="4" fill="url(#hsBrand)">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M190,130 L300,130" />
        </circle>
        <circle r="4" fill="url(#hsGreen)">
          <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M420,130 L530,130" />
        </circle>

        {/* ── Node 1: problem photo ── */}
        <g>
          <rect x="40" y="62" width="150" height="136" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" />
          <rect x="56" y="78" width="118" height="74" rx="9" fill="rgba(99,102,241,0.10)" />
          {/* a "leak/pipe" motif */}
          <path d="M82 96 h40 a8 8 0 0 1 8 8 v22" stroke="url(#hsBrand)" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="130" cy="138" r="3.5" fill="#60a5fa" />
          <circle cx="118" cy="146" r="2.5" fill="#60a5fa" opacity="0.7" />
          <rect x="56" y="162" width="80" height="8" rx="4" fill="var(--color-surface-2)" />
          <rect x="56" y="176" width="54" height="8" rx="4" fill="var(--color-surface-2)" />
          <text x="115" y="216" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--color-text-4)" fontFamily="sans-serif">Snap a photo</text>
        </g>

        {/* ── Node 2: AI diagnosis orb ── */}
        <g transform="translate(360,130)">
          <circle r="52" fill="none" stroke="url(#hsBrand)" strokeWidth="1.5" opacity="0.25">
            <animate attributeName="r" values="44;58;44" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0;0.35" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="40" fill="url(#hsBrand)" opacity="0.12" />
          <circle r="40" fill="none" stroke="url(#hsBrand)" strokeWidth="2" />
          <text x="0" y="9" textAnchor="middle" fontSize="30" filter="url(#hsGlow)">⚡</text>
          <text x="0" y="74" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--color-text-4)" fontFamily="sans-serif">AI diagnoses it</text>
        </g>

        {/* ── Node 3: matched pro ── */}
        <g>
          <rect x="530" y="62" width="150" height="136" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" />
          <circle cx="566" cy="100" r="20" fill="url(#hsGreen)" opacity="0.9" />
          <text x="566" y="106" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff" fontFamily="sans-serif">P</text>
          {/* verified check */}
          <circle cx="582" cy="114" r="9" fill="var(--color-surface)" />
          <path d="M577 114 l3.5 3.5 l6 -7" stroke="url(#hsGreen)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="596" y="90" width="70" height="8" rx="4" fill="var(--color-surface-2)" />
          <rect x="596" y="104" width="48" height="8" rx="4" fill="var(--color-surface-2)" />
          {/* stars */}
          <text x="546" y="150" fontSize="13" fill="#fbbf24" fontFamily="sans-serif">★★★★★</text>
          <rect x="546" y="162" width="118" height="22" rx="11" fill="url(#hsBrand)" opacity="0.15" />
          <text x="605" y="177" textAnchor="middle" fontSize="11" fontWeight="700" fill="#a5b4fc" fontFamily="sans-serif">Matched &amp; on the way</text>
          <text x="605" y="216" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--color-text-4)" fontFamily="sans-serif">Verified pro arrives</text>
        </g>
      </svg>
    </div>
  );
}
