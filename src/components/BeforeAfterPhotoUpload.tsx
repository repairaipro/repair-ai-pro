'use client';

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type Props = {
  jobId: string;
  onPhotoSubmitted?: () => void;
  disabled?: boolean;
};

export default function BeforeAfterPhotoUpload({ jobId, onPhotoSubmitted, disabled }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setError('');

    // Validate files
    const validFiles = newFiles.filter((file) => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        setError('Files must be under 10MB');
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter((f) => f.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      setFiles((prev) => [...prev, ...imageFiles]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one photo');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Get auth token
      const response = await fetch('/api/auth/token');
      const { token } = await response.json();

      // Upload each file
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch(`/api/jobs/${jobId}/upload-completion-photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload photo');
        }

        return uploadRes.json();
      });

      const results = await Promise.all(uploadPromises);

      setSuccess(true);
      setFiles([]);
      onPhotoSubmitted?.();

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  if (disabled) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-bold text-lg">Final Work Photos</h3>
        <p className="text-xs text-gray-600 mt-1">
          Upload photos of the completed work. These will be compared with initial photos to verify completion.
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Photos uploaded successfully!</p>
              <p className="text-xs text-green-800 mt-0.5">
                Homeowner will review the before/after comparison.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-900">{error}</p>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="relative rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 text-gray-600 hover:text-gray-900 transition"
        >
          <Upload size={32} className="text-gray-400" />
          <span className="font-medium">Click to upload or drag photos here</span>
          <span className="text-xs text-gray-500">PNG, JPG, WebP up to 10MB each</span>
        </button>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">
            {files.length} photo{files.length !== 1 ? 's' : ''} selected
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((file, idx) => (
              <div key={idx} className="relative rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-24 object-cover"
                />
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="absolute top-1 right-1 p-1 rounded bg-red-500 text-white hover:bg-red-600 transition"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded truncate">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Uploading photos...
          </>
        ) : (
          <>
            <Upload size={16} />
            Upload {files.length > 0 ? files.length : ''} Photo{files.length !== 1 ? 's' : ''}
          </>
        )}
      </button>

      {/* Info */}
      <div className="p-3 rounded-lg bg-blue-50 text-xs text-blue-900">
        <strong>💡 Tip:</strong> Take clear photos of the work area from the same angle as the initial analysis.
        This helps homeowners verify the work is complete.
      </div>
    </div>
  );
}
