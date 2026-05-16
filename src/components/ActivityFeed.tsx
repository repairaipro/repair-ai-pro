'use client';

import { useEffect, useState } from 'react';
import { Gift, Star, CheckCircle2, Loader2 } from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  createdAt: string | null;
  [key: string]: any;
}

interface ActivityFeedProps {
  limit?: number;
  filterType?: string;
}

export function ActivityFeed({ limit = 10, filterType }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch(
          `/api/activities/feed?limit=${limit}${filterType ? `&type=${filterType}` : ''}`
        );
        if (!response.ok) throw new Error('Failed to load activities');
        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [limit, filterType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
          Unable to load activities
        </p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
          No recent activity yet
        </p>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'referral_used':
        return <Gift className="w-4 h-4" style={{ color: '#22c55e' }} />;
      case 'review_submitted':
        return <Star className="w-4 h-4" style={{ color: '#fbbf24' }} />;
      case 'job_completed':
        return <CheckCircle2 className="w-4 h-4" style={{ color: '#3b82f6' }} />;
      default:
        return <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-text-4)' }} />;
    }
  };

  const getActivityMessage = (activity: Activity): string => {
    switch (activity.type) {
      case 'referral_used':
        return `Someone joined repair-ai and earned ${activity.referralType === 'contractor' ? 'a contractor' : 'a homeowner'} $${(activity.rewardAmount / 100).toFixed(2)}`;
      case 'review_submitted':
        return `A ${activity.trade} contractor received a ${activity.rating}⭐ review`;
      case 'job_completed':
        return `A new ${activity.trade} job was completed`;
      default:
        return 'New activity';
    }
  };

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
              {getActivityMessage(activity)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
              {formatTime(activity.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
