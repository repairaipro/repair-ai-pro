import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import clsx from 'clsx'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
  {
    variants: {
      variant: {
        primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
        success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
        warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
        error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
        neutral: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(badgeVariants({ variant }), className)}
      {...props}
    />
  )
)

Badge.displayName = 'Badge'

export { Badge, badgeVariants }
