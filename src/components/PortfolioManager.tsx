'use client';

import { useRef, useState } from 'react';
import { Upload, X, Plus, Loader2, AlertCircle } from 'lucide-react';
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
  /** Bearer token for the Cloudinary signing endpoint — pass the current user's ID token. */
  authToken?: string;
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

async function uploadToCloudinary(file: File, token: string): Promise<string> {
  const signRes = await fetch('/api/cloudinary/sign', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!signRes.ok) throw new Error('Failed to get upload signature');
  const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
  if (!uploadRes.ok) throw new Error('Image upload failed. Please try again.');
  return (await uploadRes.json()).secure_url as string;
}

const inputStyle = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
};

export function PortfolioManager({
  images,
  onImagesChange,
  authToken,
  isLoading = false,
  maxImages = 20,
}: PortfolioManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<Partial<PortfolioImage>>({});
  const [formError, setFormError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    if (!authToken) {
      setFormError('Still signing you in — try again in a moment.');
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file, authToken);
      setPendingUrl(url);
      setNewImage((prev) => ({ ...prev, url }));
    } catch (err: any) {
      setFormError(err.message ?? 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newImage.url || !newImage.serviceType) {
      setFormError('Add a photo and select a service type.');
      return;
    }
    if (images.length >= maxImages) {
      setFormError(`Maximum ${maxImages} images allowed.`);
      return;
    }

    onImagesChange([
      ...images,
      {
        url: newImage.url,
        serviceType: newImage.serviceType,
        caption: newImage.caption || '',
        beforeAfter: newImage.beforeAfter as 'before' | 'after' | undefined,
      },
    ]);
    setNewImage({});
    setPendingUrl(null);
  };

  return (
    <div className="space-y-4">
      {/* Add New Image Form */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Add a photo</h4>

        <form onSubmit={handleAddImage} className="space-y-3">
          {/* Photo picker */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} disabled={isUploading} />
            {pendingUrl ? (
              <div className="relative inline-block">
                <Image src={pendingUrl} alt="Selected" width={96} height={96} className="rounded-lg object-cover" style={{ width: 96, height: 96 }} />
                <button
                  type="button"
                  onClick={() => { setPendingUrl(null); setNewImage((p) => ({ ...p, url: undefined })); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'var(--color-error, #ef4444)' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 text-sm rounded-lg px-4 py-3 w-full justify-center transition-opacity hover:opacity-80"
                style={{ ...inputStyle, borderStyle: 'dashed' }}
              >
                {isUploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  : <><Upload className="w-4 h-4" /> Choose a photo</>}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-3)' }}>Service Type</label>
              <select
                value={newImage.serviceType || ''}
                onChange={(e) => setNewImage({ ...newImage, serviceType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
                disabled={isUploading}
              >
                <option value="">Select trade…</option>
                {COMMON_TRADES.map((trade) => (
                  <option key={trade} value={trade}>{trade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-3)' }}>Before/After</label>
              <select
                value={newImage.beforeAfter || ''}
                onChange={(e) => setNewImage({ ...newImage, beforeAfter: (e.target.value as 'before' | 'after') || undefined })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle}
                disabled={isUploading}
              >
                <option value="">Not specified</option>
                <option value="before">Before</option>
                <option value="after">After</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-3)' }}>Caption (optional)</label>
            <input
              type="text"
              placeholder="e.g. Kitchen renovation with new tile backsplash"
              value={newImage.caption || ''}
              onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
              disabled={isUploading}
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {formError}
            </div>
          )}

          <button type="submit" disabled={isUploading || isLoading} className="btn btn-primary btn-full btn-sm">
            <Plus className="w-4 h-4" /> Add to Portfolio
          </button>
        </form>
      </div>

      {/* Image Grid */}
      <div>
        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          Portfolio ({images.length}/{maxImages})
        </h4>

        {images.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface-2)' }}>
            <Upload className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--color-text-4)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>No portfolio photos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image, idx) => (
              <div key={idx} className="relative group overflow-hidden rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
                <Image src={image.url} alt={image.caption || `Portfolio ${idx + 1}`} width={200} height={200} className="w-full h-full object-cover" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-center px-2" style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <p className="text-xs font-medium text-white">{image.serviceType}</p>
                  {image.beforeAfter && <p className="text-xs capitalize" style={{ color: 'var(--color-text-3)' }}>{image.beforeAfter}</p>}
                </div>
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-2 right-2 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'var(--color-error, #ef4444)' }}
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
