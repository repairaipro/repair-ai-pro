'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

type PhotoPair = {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  area?: string;
  matchConfidence?: number;
};

type Props = {
  pairs: PhotoPair[];
  isLoading?: boolean;
};

export default function BeforeAfterComparison({ pairs, isLoading }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const containerRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="rounded-2xl p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (!pairs || pairs.length === 0) {
    return (
      <div className="rounded-2xl p-6 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-900">
          No before/after photos yet. Contractor will upload final photos when work is complete.
        </p>
      </div>
    );
  }

  const current = pairs[currentIndex];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">Work Verification</h3>
          <p className="text-xs text-gray-600 mt-1">
            {pairs.length} area{pairs.length !== 1 ? 's' : ''} completed
            {current.area && ` • ${current.area}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'slider' ? 'side-by-side' : 'slider')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition"
            style={{
              background: 'rgba(99,102,241,0.1)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            {viewMode === 'slider' ? 'Side-by-side' : 'Slider'}
          </button>
        </div>
      </div>

      {/* Comparison Container */}
      {viewMode === 'slider' ? (
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="relative rounded-xl overflow-hidden cursor-col-resize select-none"
          style={{
            aspectRatio: '4 / 3',
            background: '#f3f4f6',
          }}
        >
          {/* After image (background) */}
          <img
            src={current.afterUrl}
            alt="After"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Before image (slider) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={current.beforeUrl}
              alt="Before"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ width: `${100 / (sliderPosition / 100)}%` }}
            />
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white"
            style={{ left: `${sliderPosition}%`, boxShadow: '0 0 12px rgba(0,0,0,0.3)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
              <div className="flex gap-1">
                <ChevronLeft size={16} className="text-gray-700" />
                <ChevronRight size={16} className="text-gray-700" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
            Before
          </div>
          <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
            After
          </div>

          {/* Confidence badge */}
          {current.matchConfidence && current.matchConfidence > 0 && (
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-green-500/90 text-white text-xs font-medium">
              ✓ {current.matchConfidence}% match
            </div>
          )}
        </div>
      ) : (
        /* Side-by-side view */
        <div className="grid grid-cols-2 gap-3">
          {/* Before */}
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
            <img
              src={current.beforeUrl}
              alt="Before"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
              Before
            </div>
          </div>

          {/* After */}
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
            <img
              src={current.afterUrl}
              alt="After"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-medium">
              After
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {pairs.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((i) => (i === 0 ? pairs.length - 1 : i - 1))}
            className="p-2 rounded-lg transition"
            style={{
              background: 'rgba(99,102,241,0.1)',
              color: '#818cf8',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-2 flex-wrap justify-center">
            {pairs.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className="w-2 h-2 rounded-full transition"
                style={{
                  background: idx === currentIndex ? '#818cf8' : '#e5e7eb',
                }}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex((i) => (i === pairs.length - 1 ? 0 : i + 1))}
            className="p-2 rounded-lg transition"
            style={{
              background: 'rgba(99,102,241,0.1)',
              color: '#818cf8',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Info */}
      {current.area && (
        <div className="p-3 rounded-lg bg-gray-50 text-xs text-gray-700">
          <strong>Location:</strong> {current.area}
        </div>
      )}
    </div>
  );
}
