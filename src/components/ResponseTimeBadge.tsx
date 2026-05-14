'use client';

import { Clock, TrendingUp } from 'lucide-react';
import { Badge } from './ui/Badge';

interface ResponseTimeBadgeProps {
  averageResponseMinutes: number;
  trend?: 'improving' | 'stable' | 'declining';
  lastUpdated?: Date;
}

const getResponseCategory = (minutes: number) => {
  if (minutes <= 30) return { label: 'Very Fast', color: 'bg-green-100 text-green-800' };
  if (minutes <= 60) return { label: 'Fast', color: 'bg-blue-100 text-blue-800' };
  if (minutes <= 120) return { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' };
  return { label: 'Slow', color: 'bg-red-100 text-red-800' };
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${Math.round(mins)}m`;
};

export function ResponseTimeBadge({
  averageResponseMinutes,
  trend = 'stable',
  lastUpdated,
}: ResponseTimeBadgeProps) {
  const category = getResponseCategory(averageResponseMinutes);

  return (
    <div className="flex items-center gap-2">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${category.color}`}>
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">
          Responds in {formatMinutes(averageResponseMinutes)}
        </span>
      </div>

      {trend === 'improving' && (
        <Badge variant="outline" className="text-xs text-green-700">
          <TrendingUp className="mr-1 h-3 w-3" />
          Improving
        </Badge>
      )}

      {lastUpdated && (
        <span className="text-xs text-gray-600">
          Last updated {getTimeAgo(lastUpdated)}
        </span>
      )}
    </div>
  );
}

function getTimeAgo(date: Date) {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
