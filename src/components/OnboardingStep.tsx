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
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header with step indicator */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">Step {step} of {totalSteps}</p>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-8">
          {children}
        </div>
      </div>

      {/* Footer with actions */}
      <div className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={onPrev}
              className="px-6 py-2 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition"
            >
              Back
            </button>
          )}

          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              className="px-6 py-2 text-gray-400 hover:text-gray-300 text-sm transition"
            >
              Skip
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={onNext}
            disabled={!canNext}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
