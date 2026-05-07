import React from 'react'
import clsx from 'clsx'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helpText?: string
  showCharCount?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helpText, showCharCount = false, maxLength, ...props }, ref) => {
    const [charCount, setCharCount] = React.useState(0)

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length)
      props.onChange?.(e)
    }

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-neutral-900 dark:text-white">
              {label}
            </label>
            {showCharCount && maxLength && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {charCount} / {maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'block w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-none',
            error && 'border-error-500 focus:ring-error-500',
            className
          )}
          maxLength={maxLength}
          onChange={handleChange}
          {...props}
        />
        {error && (
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
        )}
        {helpText && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{helpText}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
