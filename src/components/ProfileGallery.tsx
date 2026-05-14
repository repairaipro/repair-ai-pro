'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface PortfolioImage {
  url: string;
  serviceType: string;
  caption?: string;
  beforeAfter?: 'before' | 'after';
}

interface ProfileGalleryProps {
  images: PortfolioImage[];
  contractorName: string;
}

export function ProfileGallery({ images, contractorName }: ProfileGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(
    images.length > 0 ? images[0].serviceType : null
  );

  // Group images by service type
  const imagesByService = images.reduce((acc, img) => {
    if (!acc[img.serviceType]) {
      acc[img.serviceType] = [];
    }
    acc[img.serviceType].push(img);
    return acc;
  }, {} as Record<string, PortfolioImage[]>);

  const serviceTypes = Object.keys(imagesByService);
  const currentServiceImages = selectedServiceType
    ? imagesByService[selectedServiceType]
    : images;

  const goToPrevious = () => {
    setCurrentIndex(
      currentIndex === 0 ? currentServiceImages.length - 1 : currentIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex(
      currentIndex === currentServiceImages.length - 1 ? 0 : currentIndex + 1
    );
  };

  if (images.length === 0) {
    return (
      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">No portfolio images yet</p>
      </div>
    );
  }

  const currentImage = currentServiceImages[currentIndex];

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-200">
        <Image
          src={currentImage.url}
          alt={currentImage.caption || `${contractorName}'s work`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
          priority
        />

        {/* Before/After Badge */}
        {currentImage.beforeAfter && (
          <div className="absolute top-3 right-3">
            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-semibold text-white ${
                currentImage.beforeAfter === 'before' ? 'bg-orange-500' : 'bg-green-500'
              }`}
            >
              {currentImage.beforeAfter === 'before' ? 'Before' : 'After'}
            </span>
          </div>
        )}

        {/* Navigation Arrows */}
        {currentServiceImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/20 hover:bg-black/40 text-white"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/20 hover:bg-black/40 text-white"
              onClick={goToNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-black/40 px-3 py-1 text-sm text-white">
            {currentIndex + 1} / {currentServiceImages.length}
          </span>
        </div>
      </div>

      {/* Caption */}
      {currentImage.caption && (
        <p className="text-sm text-gray-700">{currentImage.caption}</p>
      )}

      {/* Service Type Filter */}
      {serviceTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {serviceTypes.map((service) => (
            <button
              key={service}
              onClick={() => {
                setSelectedServiceType(service);
                setCurrentIndex(0);
              }}
              className={`inline-block rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedServiceType === service
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {service}
            </button>
          ))}
        </div>
      )}

      {/* Thumbnail Strip */}
      {currentServiceImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {currentServiceImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                idx === currentIndex ? 'border-blue-600' : 'border-gray-300'
              }`}
            >
              <Image
                src={img.url}
                alt={img.caption || 'portfolio'}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
