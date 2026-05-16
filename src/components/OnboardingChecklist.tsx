'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, Gift } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium';
  reward?: number;
}

interface OnboardingChecklistProps {
  userType: 'contractor' | 'homeowner';
}

export function OnboardingChecklist({ userType }: OnboardingChecklistProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [rewards, setRewards] = useState({ earned: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOnboardingProgress = async () => {
      try {
        const response = await fetch(`/api/onboarding/progress?type=${userType}`);
        if (!response.ok) throw new Error('Failed to load onboarding progress');
        const data = await response.json();
        setTasks(data.tasks);
        setProgress(data.progress);
        setRewards(data.rewards);
      } catch (err) {
        console.error('Failed to load onboarding:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingProgress();
  }, [userType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  const priorityColor = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Get Started Checklist
          </h2>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-brand)' }}>
            {progress.completed}/{progress.total} complete
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${progress.percentage}%`,
              background: `linear-gradient(90deg, #6366f1, #8b5cf6)`,
            }}
          />
        </div>
      </div>

      {/* Reward Display */}
      <div
        className="p-3 rounded-lg mb-6 flex items-center gap-2"
        style={{ background: 'rgba(34,197,94,0.1)' }}
      >
        <Gift className="w-4 h-4" style={{ color: '#22c55e' }} />
        <p className="text-sm" style={{ color: '#22c55e' }}>
          Complete tasks to earn <strong>${(rewards.earned / 100).toFixed(2)}</strong> in credits (${(rewards.total / 100).toFixed(2)} total available)
        </p>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-4 rounded-lg transition-colors"
            style={{
              background: task.completed ? 'rgba(34,197,94,0.05)' : 'var(--color-surface-2)',
              borderLeft: `3px solid ${priorityColor[task.priority]}`,
            }}
          >
            {/* Checkbox */}
            <div className="mt-0.5 flex-shrink-0">
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5" style={{ color: '#22c55e' }} />
              ) : (
                <Circle className="w-5 h-5" style={{ color: 'var(--color-text-4)' }} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium"
                style={{
                  color: task.completed ? '#22c55e' : 'var(--color-text)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                }}
              >
                {task.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
                {task.description}
              </p>
            </div>

            {/* Reward */}
            {task.reward && (
              <div className="flex-shrink-0 text-right">
                <p
                  className="text-sm font-semibold"
                  style={{ color: task.completed ? '#22c55e' : 'var(--color-text-3)' }}
                >
                  +${(task.reward / 100).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Completion message */}
      {progress.completed === progress.total && (
        <div
          className="mt-6 p-4 rounded-lg text-center"
          style={{ background: 'rgba(34,197,94,0.1)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
            🎉 Welcome to repair-ai! You're all set to start.
          </p>
        </div>
      )}
    </div>
  );
}
