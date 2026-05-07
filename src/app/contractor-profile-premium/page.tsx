'use client'

import React from 'react'
import Image from 'next/image'
import { MapPin, Phone, Mail, Clock, DollarSign, Check, Star, AlertCircle, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Rating } from '@/components/ui/Rating'

// Demo contractor data
const demoContractor = {
  id: '123',
  name: "John's Plumbing & HVAC",
  photo: 'https://images.unsplash.com/photo-1582721471835-a2fda5147bd3?w=400&h=400&fit=crop',
  serviceTypes: ['Plumbing', 'HVAC', 'General Repairs'],
  rating: 4.8,
  reviewCount: 47,
  yearsExperience: 12,
  hourlyRate: 150,
  responseTime: '2 hours',
  city: 'The Woodlands, TX',
  isVerified: true,
  bio: 'Licensed master plumber with 12 years of experience serving the Houston area. Fast, reliable, and honest service.',
  phone: '(713) 555-1234',
  email: 'john@example.com',
  completedJobs: 147,
  onTimeRate: 98,
  repeatCustomers: 85,
}

const demoReviews = [
  {
    id: '1',
    rating: 5,
    title: 'Excellent work!',
    content: 'Fixed my burst pipe quickly and professionally. Very fair pricing.',
    reviewerName: 'Sarah M.',
    date: '2 weeks ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&h=48&fit=crop',
  },
  {
    id: '2',
    rating: 5,
    title: 'Highly recommended',
    content: 'John arrived on time, explained everything, and cleaned up after. Will hire again!',
    reviewerName: 'Mike J.',
    date: '1 month ago',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop',
  },
  {
    id: '3',
    rating: 4,
    title: 'Great service',
    content: 'Replaced my AC unit. Professional work. Slightly pricey but worth it.',
    reviewerName: 'Lisa K.',
    date: '2 months ago',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop',
  },
]

const demoPhotos = [
  'https://images.unsplash.com/photo-1584568694244-14fbbc50d737?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1581578731548-c64695c952952?w=300&h=300&fit=crop',
]

export default function ContractorProfilePremiumPage() {
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      {/* Hero section with background */}
      <div className="relative h-64 bg-gradient-to-r from-primary-500 to-primary-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-pattern" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Profile card (overlaps hero) */}
        <div className="-mt-32 mb-8 relative z-10">
          <Card className="bg-white dark:bg-neutral-900">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col sm:flex-row gap-8">
                {/* Profile photo */}
                <div className="flex-shrink-0">
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white dark:ring-neutral-800">
                    <Image
                      src={demoContractor.photo}
                      alt={demoContractor.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Profile info */}
                <div className="flex-1">
                  {/* Header with name and badges */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                          {demoContractor.name}
                        </h1>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {demoContractor.isVerified && (
                            <Badge variant="success" className="font-semibold">
                              <Check className="w-3.5 h-3.5" />
                              Verified Professional
                            </Badge>
                          )}
                          <Badge variant="primary">
                            🏆 Top Rated
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Rating and stats */}
                    <div className="flex items-center gap-6 mb-4">
                      <div>
                        <Rating value={demoContractor.rating} count={demoContractor.reviewCount} />
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {demoContractor.completedJobs} completed
                        </span>
                      </div>
                    </div>

                    {/* Quick info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                          EXPERIENCE
                        </p>
                        <p className="font-bold text-neutral-900 dark:text-white">
                          {demoContractor.yearsExperience} years
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                          RESPONSE TIME
                        </p>
                        <p className="font-bold text-neutral-900 dark:text-white">
                          {demoContractor.responseTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                          ON-TIME RATE
                        </p>
                        <p className="font-bold text-success-600">
                          {demoContractor.onTimeRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                          REPEAT CLIENTS
                        </p>
                        <p className="font-bold text-primary-600">
                          {demoContractor.repeatCustomers}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button variant="primary" className="flex-1">
                      Request This Contractor
                    </Button>
                    <Button variant="outline">Save</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - About & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6">
                  {demoContractor.bio}
                </p>

                {/* Services */}
                <div className="mb-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">
                    Services Offered
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {demoContractor.serviceTypes.map((service) => (
                      <Badge key={service} variant="primary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary-600" />
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {demoContractor.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary-600" />
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {demoContractor.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary-600" />
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {demoContractor.city}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo gallery */}
            <Card>
              <CardHeader>
                <CardTitle>Work Samples</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {demoPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPhoto(photo)}
                      className="relative h-32 rounded-lg overflow-hidden hover:opacity-90 transition-opacity ring-2 ring-transparent hover:ring-primary-500"
                    >
                      <Image
                        src={photo}
                        alt={`Work sample ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {demoReviews.map((review) => (
                  <div key={review.id} className="pb-6 border-b border-neutral-200 dark:border-neutral-700 last:border-0 last:pb-0">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={review.avatar}
                          alt={review.reviewerName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-neutral-900 dark:text-white">
                            {review.reviewerName}
                          </h4>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {review.date}
                          </span>
                        </div>
                        <div className="mb-2">
                          <Rating value={review.rating} size="sm" />
                        </div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                          {review.title}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {review.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Booking info */}
          <div className="space-y-8">
            {/* Pricing card */}
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-700">
              <CardHeader>
                <CardTitle className="text-primary-900 dark:text-primary-100">
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-primary-700 dark:text-primary-300 font-medium">
                    Hourly Rate
                  </span>
                  <span className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                    ${demoContractor.hourlyRate}
                  </span>
                </div>
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Typical job costs vary. Get a custom quote after booking.
                </p>
              </CardContent>
            </Card>

            {/* Trust indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why Choose John</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Check className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">
                      Background Verified
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      Professional credentials verified
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">
                      Insured & Licensed
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      Full coverage for your peace of mind
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">
                      Fast Response
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      Typically responds within 2 hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Safety badge */}
            <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-success-900 dark:text-success-100 text-sm mb-1">
                    Payment Protected
                  </p>
                  <p className="text-xs text-success-800 dark:text-success-200">
                    Funds held safely until you confirm the work is done
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo modal (simplified) */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl w-full aspect-square">
            <Image
              src={selectedPhoto}
              alt="Work sample"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
