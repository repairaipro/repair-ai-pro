import { ReactNode } from 'react';

interface OnboardingStepProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onSkip?: () => void;
  canNext: boolean;
  nextLabel?: string;
  showSkip?: boolean;
}

export default function OnboardingStep({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onPrev,
  onSkip,
  canNext,
  nextLabel = 'Next',
  showSkip = false,
}: OnboardingStepProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header with step indicator */}
      <div
        className="backdrop-blur-sm sticky top-0 z-10"
        style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-4)' }}>Step {step} of {totalSteps}</p>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{title}</h1>
              {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--color-text-3)' }}>{subtitle}</p>}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(step / totalSteps) * 100}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {children}
        </div>
      </div>

      {/* Footer with actions */}
      <div
        className="backdrop-blur-sm"
        style={{ background: 'var(--color-bg-2)', borderTop: '1px solid var(--color-border)' }}
      >
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-center gap-3">
          {step > 1 && (
            <button onClick={onPrev} className="btn btn-secondary">
              Back
            </button>
          )}

          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              className="px-6 py-2 text-sm transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-text-4)' }}
            >
              Skip
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={onNext}
            disabled={!canNext}
            className="btn btn-primary"
            style={!canNext ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
