'use client'

import React, { useState } from 'react'
import { ArrowRight, Check, Upload, MapPin, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'

type Step = 1 | 2 | 3 | 4 | 5

interface FormData {
  serviceType: string
  description: string
  photos: string[]
  date: string
  timeSlot: string
  address: string
  city: string
  zipCode: string
}

export default function CreateJobPremiumPage() {
  const [step, setStep] = useState<Step>(1)
  const [formData, setFormData] = useState<FormData>({
    serviceType: '',
    description: '',
    photos: [],
    date: '',
    timeSlot: '',
    address: '',
    city: '',
    zipCode: '',
  })

  const serviceTypes = [
    { id: 'plumbing', name: '🚰 Plumbing', description: 'Leaks, clogs, repairs' },
    { id: 'hvac', name: '❄️ HVAC', description: 'AC, heating, repairs' },
    { id: 'electrical', name: '⚡ Electrical', description: 'Wiring, outlets, repairs' },
    { id: 'general', name: '🔧 General', description: 'Drywall, carpentry, etc' },
  ]

  const handleServiceSelect = (serviceId: string) => {
    setFormData({ ...formData, serviceType: serviceId })
    setStep(2)
  }

  const handlePhotoAdd = () => {
    setFormData({
      ...formData,
      photos: [...formData.photos, `photo-${Date.now()}`],
    })
  }

  const handleNext = (nextStep: Step) => {
    if (nextStep === 3 && !formData.description.trim()) {
      alert('Please describe the issue')
      return
    }
    if (nextStep === 5 && !formData.date) {
      alert('Please select a date')
      return
    }
    setStep(nextStep)
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                What's broken?
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Select the type of service you need
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serviceTypes.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className={`p-6 rounded-lg border-2 transition-all duration-150 text-left ${
                    formData.serviceType === service.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{service.name.split(' ')[0]}</div>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {service.name.split(' ').slice(1).join(' ')}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {service.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Show us
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Upload photos so contractors understand the issue
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.photos.map((photo, idx) => (
                <div
                  key={photo}
                  className="relative h-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center group hover:bg-neutral-300 transition-colors"
                >
                  <button className="text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity text-2xl">
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={handlePhotoAdd}
                className="h-32 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center hover:border-primary-500 transition-colors group"
              >
                <div className="text-center">
                  <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-2 group-hover:text-primary-500 transition-colors" />
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {formData.photos.length === 0
                      ? 'Add photos'
                      : 'Add more'}
                  </p>
                </div>
              </button>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              💡 Pro tip: Upload clear photos of the problem. Contractors respond 3x faster!
            </p>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => handleNext(3)}
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Describe the issue
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Tell contractors what you need fixed
              </p>
            </div>

            <Textarea
              label="What's the problem?"
              placeholder="Example: My kitchen sink is clogged and water won't drain. It started this morning..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={5}
              maxLength={500}
              showCharCount
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handleNext(4)}
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                When do you need it?
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Contractors respond faster to urgent jobs
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Preferred date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />

              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-3">
                  Preferred time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Morning (7-10am)', 'Midday (10am-2pm)', 'Afternoon (2-5pm)', 'Evening (5-7pm)'].map(
                    (slot) => (
                      <button
                        key={slot}
                        onClick={() =>
                          setFormData({ ...formData, timeSlot: slot })
                        }
                        className={`p-3 rounded-lg border-2 transition-all duration-150 text-sm font-medium ${
                          formData.timeSlot === slot
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white hover:border-primary-300'
                        }`}
                      >
                        {slot}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(3)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handleNext(5)}
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Where do you need it?
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                We'll match you with local contractors
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Street address"
                placeholder="123 Main St"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  placeholder="The Woodlands"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
                <Input
                  label="ZIP code"
                  placeholder="77380"
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Summary */}
            <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-4">
                  Your job request
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-primary-700 dark:text-primary-300">Service:</span>
                    <span className="font-semibold text-primary-900 dark:text-primary-100">
                      {
                        serviceTypes.find(
                          (s) => s.id === formData.serviceType
                        )?.name
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-700 dark:text-primary-300">Date:</span>
                    <span className="font-semibold text-primary-900 dark:text-primary-100">
                      {formData.date || 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-700 dark:text-primary-300">Location:</span>
                    <span className="font-semibold text-primary-900 dark:text-primary-100">
                      {formData.city || 'Not selected'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(4)}
              >
                Back
              </Button>
              <Button variant="success" className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Post Job
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <React.Fragment key={num}>
                <button
                  onClick={() => {
                    if (num < step) setStep(num as Step)
                  }}
                  className={`w-10 h-10 rounded-full font-bold transition-all duration-150 ${
                    num < step
                      ? 'bg-success-500 text-white'
                      : num === step
                        ? 'bg-primary-600 text-white ring-4 ring-primary-300 dark:ring-primary-800'
                        : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {num < step ? <Check className="w-5 h-5" /> : num}
                </button>
                {num < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all duration-150 ${
                      num < step
                        ? 'bg-success-500'
                        : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Step {step} of 5
            </p>
          </div>
        </div>

        {/* Form content */}
        <Card className="bg-white dark:bg-neutral-900">
          <CardContent className="pt-8">{renderStep()}</CardContent>
        </Card>
      </div>
    </div>
  )
}
