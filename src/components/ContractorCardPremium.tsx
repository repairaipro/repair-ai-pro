'use client'

import React from 'react'
import Image from 'next/image'
import { MapPin, Clock, DollarSign, Check, Badge } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge as BadgeComponent } from '@/components/ui/Badge'
import { Rating } from '@/components/ui/Rating'
import clsx from 'clsx'

interface ContractorCardPremiumProps {
  contractor: {
    id: string
    name: string
    photo?: string
    serviceType: string
    rating: number
    reviewCount: number
    yearsExperience: number
    hourlyRate?: number
    typicalJobCost?: string
    responseTime?: string
    isVerified?: boolean
    city: string
  }
  variant?: 'standard' | 'compact'
  onViewProfile?: () => void
  onAccept?: () => void
  isSelected?: boolean
  aiMatch?: number // 0-100
  aiExplanation?: string
  financingAvailable?: boolean
  showAction?: boolean
  loading?: boolean
}

export function ContractorCardPremium({
  contractor,
  variant = 'standard',
  onViewProfile,
  onAccept,
  isSelected = false,
  aiMatch,
  aiExplanation,
  financingAvailable = false,
  showAction = true,
  loading = false,
}: ContractorCardPremiumProps) {
  if (variant === 'compact') {
    return (
      <Card
        className={clsx(
          'cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-1',
          isSelected && 'ring-2 ring-primary-500 shadow-lg'
        )}
        onClick={onViewProfile}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {contractor.photo && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={contractor.photo}
                  alt={contractor.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                  {contractor.name}
                </h3>
                {contractor.isVerified && (
                  <Check className="w-4 h-4 text-success-600 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {contractor.serviceType}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Rating value={contractor.rating} count={contractor.reviewCount} size="sm" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={clsx(isSelected && 'ring-2 ring-primary-500 shadow-xl')}>
      {/* Header with photo */}
      <div className="relative h-48 overflow-hidden rounded-t-lg bg-gradient-to-br from-primary-500 to-primary-600">
        {contractor.photo && (
          <Image
            src={contractor.photo}
            alt={contractor.name}
            fill
            className="object-cover"
          />
        )}
        {aiMatch !== undefined && (
          <div className="absolute top-3 right-3">
            <BadgeComponent variant="success" className="font-bold">
              {aiMatch}% Match
            </BadgeComponent>
          </div>
        )}
        {financingAvailable && (
          <div className="absolute top-3 left-3">
            <BadgeComponent variant="primary">
              💳 Financing Available
            </BadgeComponent>
          </div>
        )}
      </div>

      <CardContent className="pt-6">
        {/* Name and verification */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                {contractor.name}
              </h2>
              {contractor.isVerified && (
                <div className="flex items-center gap-1 bg-success-50 dark:bg-success-900/20 px-2 py-1 rounded-full">
                  <Check className="w-4 h-4 text-success-600" />
                  <span className="text-xs font-semibold text-success-700 dark:text-success-400">
                    Verified
                  </span>
                </div>
              )}
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">
              {contractor.serviceType}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="mb-6">
          <Rating
            value={contractor.rating}
            count={contractor.reviewCount}
            size="md"
          />
        </div>

        {/* AI Explanation */}
        {aiExplanation && (
          <div className="mb-6 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <p className="text-sm text-primary-800 dark:text-primary-300">
              <span className="font-semibold">Why this match:</span> {aiExplanation}
            </p>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <Badge className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Experience
              </p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {contractor.yearsExperience} years
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success-50 dark:bg-success-900/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-success-600" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Response
              </p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {contractor.responseTime || '2 hours'}
              </p>
            </div>
          </div>

          {contractor.typicalJobCost && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-warning-50 dark:bg-warning-900/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-warning-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Typical Cost
                </p>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {contractor.typicalJobCost}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Location
              </p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {contractor.city}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {showAction && (
          <div className="flex gap-3">
            {onViewProfile && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={onViewProfile}
                disabled={loading}
              >
                View Profile
              </Button>
            )}
            {onAccept && (
              <Button
                variant="success"
                className="flex-1"
                onClick={onAccept}
                isLoading={loading}
              >
                Select Contractor
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
