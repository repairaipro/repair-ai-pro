'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import OnboardingStep from '@/components/OnboardingStep';
import Link from 'next/link';

export default function HomeownerOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form state
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) router.push('/auth/signin');
  }, [user, router]);

  const validateStep = (currentStep: number): boolean => {
    setError('');
    switch (currentStep) {
      case 1:
        return true; // Welcome is always valid
      case 2:
        return true; // Location is optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      setError('Please fill in required fields');
      return;
    }
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Mark onboarding as complete and save optional location + phone
      await updateDoc(doc(db, 'users', user.uid), {
        onboardingComplete: true,
        city: city.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <p className="text-gray-400">Redirecting...</p>
      </div>
    );
  }

  return (
    <OnboardingStep
      step={step}
      totalSteps={2}
      title={step === 1 ? 'Welcome to Repair AI Pro' : 'Find nearby contractors'}
      subtitle={
        step === 1
          ? 'The easiest way to find skilled contractors for any job'
          : 'We'll show you available contractors in your area'
      }
      onNext={handleNext}
      onPrev={handlePrev}
      onSkip={step === 2 ? handleSkip : undefined}
      canNext={!loading && validateStep(step)}
      nextLabel={step === 2 ? 'Post my first job' : 'Next'}
      showSkip={step === 2}
    >
      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="space-y-8">
          {/* Feature list */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="text-2xl flex-shrink-0">🔧</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Any Service, Any Contractor</h3>
                <p className="text-gray-400 text-sm">
                  From plumbing to electrical work, find qualified contractors for any job
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-2xl flex-shrink-0">💰</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Secure Payments</h3>
                <p className="text-gray-400 text-sm">
                  Your payment is held securely until you confirm the work is complete
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-2xl flex-shrink-0">⭐</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Verified Contractors</h3>
                <p className="text-gray-400 text-sm">
                  View ratings and reviews from other homeowners to make confident choices
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-2xl flex-shrink-0">📍</div>
              <div>
                <h3 className="font-semibold text-white mb-1">Local & Responsive</h3>
                <p className="text-gray-400 text-sm">
                  Find contractors near you who are ready to start right away
                </p>
              </div>
            </div>
          </div>

          {/* CTA section */}
          <div className="p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
            <p className="text-indigo-300 text-sm">
              <strong>Ready to get started?</strong> Post a job in the next step and get connected with qualified contractors in minutes.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Location & Phone */}
      {step === 2 && (
        <div className="space-y-6">
          <p className="text-gray-300 text-sm">
            Tell us where you are and how to reach you. All fields are optional—you can update them later.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              City (optional)
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. San Francisco"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              ZIP Code (optional)
            </label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="e.g. 94103"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Phone Number (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Used to send job updates & messages via SMS.</p>
          </div>

          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-500 mb-2">💡 Tip:</p>
            <p className="text-sm text-gray-300">
              You can also specify location when posting a job. Skip all fields if you'd rather set them up later.
            </p>
          </div>
        </div>
      )}
    </OnboardingStep>
  );
}
