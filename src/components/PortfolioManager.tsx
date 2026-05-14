'use client';

import { useState } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import { Button } from './ui/Button';
import Image from 'next/image';

interface PortfolioImage {
  url: string;
  serviceType: string;
  caption?: string;
  beforeAfter?: 'before' | 'after';
}

interface PortfolioManagerProps {
  images: PortfolioImage[];
  onImagesChange: (images: PortfolioImage[]) => void;
  isLoading?: boolean;
  maxImages?: number;
}

const COMMON_TRADES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Roofing',
  'Carpentry',
  'Painting',
  'Drywall',
  'Flooring',
  'Appliances',
  'Tile Work',
  'Other',
];

export function PortfolioManager({
  images,
  onImagesChange,
  isLoading = false,
  maxImages = 20,
}: PortfolioManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [newImage, setNewImage] = useState<Partial<PortfolioImage>>({});

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newImage.url || !newImage.serviceType) {
      alert('Please fill in all fields');
      return;
    }

    if (images.length >= maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setIsUploading(true);
    try {
      const imageToAdd: PortfolioImage = {
        url: newImage.url,
        serviceType: newImage.serviceType,
        caption: newImage.caption || '',
        beforeAfter: newImage.beforeAfter as 'before' | 'after' | undefined,
      };

      onImagesChange([...images, imageToAdd]);
      setNewImage({});
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add New Image Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Add Portfolio Image</h4>

        <form onSubmit={handleAddImage} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={newImage.url || ''}
              onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isUploading}
            />
            <p className="mt-1 text-xs text-gray-600">
              Upload to Cloudinary or your image hosting service first
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <select
                value={newImage.serviceType || ''}
                onChange={(e) => setNewImage({ ...newImage, serviceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploading}
              >
                <option value="">Select trade...</option>
                {COMMON_TRADES.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Before/After (Optional)
              </label>
              <select
                value={newImage.beforeAfter || ''}
                onChange={(e) =>
                  setNewImage({
                    ...newImage,
                    beforeAfter: (e.target.value as 'before' | 'after') || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploading}
              >
                <option value="">Not specified</option>
                <option value="before">Before</option>
                <option value="after">After</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caption (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., 'Kitchen renovation with new tile backsplash'"
              value={newImage.caption || ''}
              onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isUploading}
            />
          </div>

          <Button
            type="submit"
            disabled={isUploading || isLoading}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isUploading ? 'Adding...' : 'Add Image'}
          </Button>
        </form>
      </div>

      {/* Image Grid */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">
          Portfolio Images ({images.length}/{maxImages})
        </h4>

        {images.length === 0 ? (
          <div className="rounded-lg border border-gray-200 border-dashed bg-gray-50 p-8 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No portfolio images yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, idx) => (
              <div
                key={idx}
                className="relative group overflow-hidden rounded-lg bg-gray-100"
              >
                <Image
                  src={image.url}
                  alt={image.caption || `Portfolio ${idx + 1}`}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div className="text-center">
                    <p className="text-xs text-white font-medium">{image.serviceType}</p>
                    {image.beforeAfter && (
                      <p className="text-xs text-gray-300 capitalize">{image.beforeAfter}</p>
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
