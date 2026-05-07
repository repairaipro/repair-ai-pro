'use client'

import React from 'react'
import Image from 'next/image'
import { Check, CheckCheck, Clock } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

interface ChatMessagePremiumProps {
  id?: string
  content: string
  photoUrl?: string
  senderName: string
  senderPhoto?: string
  senderType: 'contractor' | 'homeowner'
  isOwn: boolean
  timestamp: Date
  status?: 'sending' | 'sent' | 'read'
  onPhotoClick?: () => void
}

export function ChatMessagePremium({
  content,
  photoUrl,
  senderName,
  senderPhoto,
  senderType,
  isOwn,
  timestamp,
  status = 'read',
  onPhotoClick,
}: ChatMessagePremiumProps) {
  const timeString = formatDistanceToNow(timestamp, { addSuffix: true })

  return (
    <div className={clsx('flex gap-3 mb-4', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      {!isOwn && senderPhoto && (
        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={senderPhoto}
            alt={senderName}
            fill
            className="object-cover"
          />
        </div>
      )}
      {!isOwn && !senderPhoto && (
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          {senderName.charAt(0)}
        </div>
      )}

      <div className={clsx('flex flex-col', isOwn && 'items-end')}>
        {/* Message bubble with content */}
        <div
          className={clsx(
            'rounded-2xl px-4 py-3 max-w-xs lg:max-w-md xl:max-w-lg break-words transition-all duration-150',
            isOwn
              ? 'bg-primary-600 text-white rounded-br-none'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-none'
          )}
        >
          {/* Photo if exists */}
          {photoUrl && (
            <div
              className="relative w-full h-48 rounded-lg overflow-hidden mb-2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={onPhotoClick}
            >
              <Image
                src={photoUrl}
                alt="Message attachment"
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Text content */}
          <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>

        {/* Timestamp and status */}
        <div
          className={clsx(
            'mt-1 flex items-center gap-1 text-xs',
            isOwn
              ? 'text-neutral-500 dark:text-neutral-400'
              : 'text-neutral-600 dark:text-neutral-400'
          )}
        >
          {isOwn && status === 'sending' && (
            <Clock className="w-3 h-3" />
          )}
          {isOwn && status === 'sent' && (
            <Check className="w-3 h-3" />
          )}
          {isOwn && status === 'read' && (
            <CheckCheck className="w-3 h-3 text-success-500" />
          )}
          <span>{timeString}</span>
        </div>
      </div>
    </div>
  )
}
