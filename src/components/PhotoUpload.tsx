'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';

interface PhotoUploadProps {
  onUpload: (url: string) => void;
  existingUrl?: string;
}

async function uploadToCloudinary(file: File, token: string): Promise<string> {
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!signRes.ok) throw new Error("Failed to get upload signature");
  const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!uploadRes.ok) throw new Error("Cloudinary upload failed");
  const data = await uploadRes.json();
  return data.secure_url as string;
}

export default function PhotoUpload({ onUpload, existingUrl }: PhotoUploadProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file || !user) return;

    setError('');
    setUploading(true);

    try {
      const token = await user.getIdToken();
      const url = await uploadToCloudinary(file, token);
      onUpload(url);
    } catch (err: any) {
      setError(err.message || 'Photo upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 flex-shrink-0">
        {existingUrl ? (
          <img
            src={existingUrl}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-3xl border-2 border-gray-700">
            👷
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <span className="animate-spin text-lg">⏳</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm px-4 py-2 rounded-lg transition disabled:opacity-50 text-gray-300"
        >
          {uploading ? 'Uploading…' : 'Upload Photo'}
        </button>
        <p className="text-xs text-gray-600 mt-1.5">JPG or PNG. Shown on your public profile.</p>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  );
}
