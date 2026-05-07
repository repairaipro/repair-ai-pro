'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TRADES } from '@/lib/constants';
import OnboardingStep from '@/components/OnboardingStep';
import PhotoUpload from '@/components/PhotoUpload';

export default function ContractorOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form state
  const [trade, setTrade] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState(25);

  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [bio, setBio] = useState('');
  const [hourly, setHourly] = useState('');
  const [availability, setAvailability] = useState('available');
  const [trades, setTrades] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) router.push('/auth/signin');
  }, [user, router]);

  // Pure function — no side effects, safe to call during render
  const isStepValid = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1: return !!(trade && city && zipCode);
      case 2: return !!(name && phone);
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    setError('');
    if (!isStepValid(step)) {
      setError('Please fill in all required fields');
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkip = () => {
    if (step === 3) {
      setStep(4);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const contractorData = {
        uid: user.uid,
        name: name.trim(),
        email: user.email,
        phone: phone.trim(),
        trade: trade.trim(),
        city: city.trim(),
        zipCode: zipCode.trim(),
        serviceRadiusMiles: parseInt(String(radius), 10),
        photoUrl: photoUrl || user.photoURL || '',
        bio: bio.trim(),
        hourly: hourly ? parseFloat(hourly) : undefined,
        availability,
        trades: trades.length > 0 ? trades : [trade],
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'contractors', user.uid), contractorData);

      await updateDoc(doc(db, 'users', user.uid), {
        onboardingComplete: true,
      });

      router.push('/contractor-inbox');
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
      totalSteps={4}
      title={
        step === 1
          ? 'What trade are you?'
          : step === 2
          ? 'Contact information'
          : step === 3
          ? 'Business details'
          : 'Review your profile'
      }
      subtitle={
        step === 1
          ? "We'll match you with nearby jobs"
          : step === 2
          ? 'Homeowners will see this information'
          : step === 3
          ? 'Add more details about your business (optional)'
          : 'Make sure everything looks good'
      }
      onNext={handleNext}
      onPrev={handlePrev}
      onSkip={step === 3 ? handleSkip : undefined}
      canNext={!loading && isStepValid(step)}
      nextLabel={step === 4 ? 'Start accepting jobs' : 'Next'}
      showSkip={step === 3}
    >
      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Primary Trade *
            </label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select a trade...</option>
              {TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              City *
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. San Francisco"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                ZIP Code *
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
                Service Radius: {radius} mi
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or business name"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Profile Photo (optional)
            </label>
            <PhotoUpload
              onUpload={(url) => setPhotoUrl(url)}
              existingUrl={photoUrl || user?.photoURL}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Bio / Description
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell homeowners about your experience and expertise..."
              rows={4}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Hourly Rate (USD, optional)
            </label>
            <input
              type="number"
              value={hourly}
              onChange={(e) => setHourly(e.target.value)}
              placeholder="e.g. 75"
              min="0"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Availability Status
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="available">Available - Taking jobs</option>
              <option value="busy">Busy - Limited availability</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Trade</p>
            <p className="text-white font-medium">{trade}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Location</p>
              <p className="text-white font-medium">
                {city}, {zipCode}
              </p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Service Radius</p>
              <p className="text-white font-medium">{radius} miles</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Name</p>
              <p className="text-white font-medium">{name}</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              <p className="text-white font-medium">{phone}</p>
            </div>
          </div>

          {bio && (
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Bio</p>
              <p className="text-white text-sm">{bio}</p>
            </div>
          )}

          {hourly && (
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Hourly Rate</p>
              <p className="text-white font-medium">${hourly}/hr</p>
            </div>
          )}

          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg mt-6">
            <p className="text-sm text-indigo-300">
              You're all set! Click the button below to start accepting jobs from homeowners in your area.
            </p>
          </div>
        </div>
      )}
    </OnboardingStep>
  );
}
