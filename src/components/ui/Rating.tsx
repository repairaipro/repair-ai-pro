'use client'

import React from 'react'
import { Star } from 'lucide-react'

interface RatingProps {
  value: number // 0-5
  count?: number // number of reviews
  interactive?: boolean
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const Rating: React.FC<RatingProps> = ({
  value,
  count,
  interactive = false,
  onChange,
  size = 'md',
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)
  const displayValue = hoverValue !== null ? hoverValue : value

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => {
              if (interactive && onChange) {
                onChange(star)
              }
            }}
            onMouseEnter={() => interactive && setHoverValue(star)}
            onMouseLeave={() => interactive && setHoverValue(null)}
            disabled={!interactive}
            className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
          >
            <Star
              className={`${sizeClasses[size]} transition-colors ${
                star <= displayValue
                  ? 'fill-warning-400 text-warning-400'
                  : 'text-neutral-300 dark:text-neutral-600'
              }`}
            />
          </button>
        ))}
      </div>
      {count !== undefined && (
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {value.toFixed(1)} ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  )
}

export { Rating }
