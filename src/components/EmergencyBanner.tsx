'use client';

interface EmergencyBannerProps {
  isActive: boolean;
  fee: number;
  onToggle: () => void;
}

export default function EmergencyBanner({ isActive, fee, onToggle }: EmergencyBannerProps) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={{
        background: isActive
          ? 'rgba(239,68,68,0.10)'
          : 'rgba(239,68,68,0.04)',
        border: isActive
          ? '1.5px solid rgba(239,68,68,0.55)'
          : '1.5px solid rgba(239,68,68,0.22)',
        boxShadow: isActive
          ? '0 0 18px rgba(239,68,68,0.18), inset 0 0 24px rgba(239,68,68,0.06)'
          : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span style={{ fontSize: 22, lineHeight: 1.2, flexShrink: 0 }}>🚨</span>
          <div className="min-w-0">
            <div
              className="text-sm font-bold mb-0.5 flex items-center gap-2"
              style={{ color: isActive ? '#fca5a5' : '#f87171' }}
            >
              Emergency Fast Lane
              {isActive && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)' }}
                >
                  ACTIVE
                </span>
              )}
            </div>
            <p
              className="text-xs leading-snug"
              style={{ color: isActive ? 'rgba(252,165,165,0.85)' : 'rgba(248,113,113,0.7)' }}
            >
              Contractors respond within 2 hours — guaranteed
            </p>
            <div
              className="text-sm font-semibold mt-1.5"
              style={{ color: isActive ? '#fca5a5' : '#f87171' }}
            >
              +${fee} surcharge
            </div>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={onToggle}
          className="relative flex-shrink-0 transition-all duration-200"
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: isActive
              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
              : 'var(--color-surface-2)',
            border: isActive
              ? '1px solid rgba(239,68,68,0.5)'
              : '1px solid var(--color-border)',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: isActive ? '0 0 10px rgba(239,68,68,0.35)' : 'none',
          }}
        >
          <span
            className="absolute top-0.5 transition-all duration-200"
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              left: isActive ? 22 : 2,
            }}
          />
        </button>
      </div>
    </div>
  );
}
