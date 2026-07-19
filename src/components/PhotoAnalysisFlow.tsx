'use client';

import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Camera, Loader } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { PhotoAnalysisResponse } from '@/app/api/jobs/[jobId]/analyze-photos/route';

type Props = {
  jobId: string;
  trade?: string;
  onAnalysisComplete?: (analysis: PhotoAnalysisResponse) => void;
};

export default function PhotoAnalysisFlow({
  jobId,
  trade,
  onAnalysisComplete,
}: Props) {
  const { user } = useAuth();
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || !user) return;

    setError('');
    const newUrls: string[] = [];

    try {
      const authToken = await user.getIdToken();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        const cloudinaryResponse = await fetch('/api/cloudinary/sign', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!cloudinaryResponse.ok) throw new Error('Failed to get upload signature');

        const { signature, timestamp, apiKey, cloudName, folder } =
          await cloudinaryResponse.json();

        // Upload to Cloudinary
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('signature', signature);
        uploadFormData.append('timestamp', timestamp);
        uploadFormData.append('api_key', apiKey);
        uploadFormData.append('folder', folder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: uploadFormData,
          }
        );

        const uploadedFile = await uploadRes.json();
        if (uploadedFile.secure_url) {
          newUrls.push(uploadedFile.secure_url);
        }
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload one or more photos');
    }

    setUploadedUrls([...uploadedUrls, ...newUrls]);
    setUploadProgress(0);
  };

  const handleAnalyze = async () => {
    if (uploadedUrls.length === 0) {
      setError('Please upload at least one photo');
      return;
    }
    if (!user) {
      setError('Please sign in to analyze photos');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `/api/jobs/${jobId}/analyze-photos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            photoUrls: uploadedUrls,
            trade,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ?? errorData.message ?? 'Failed to analyze photos'
        );
      }

      const { data } = await response.json();
      setAnalysis(data);
      onAnalysisComplete?.(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to analyze photos'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Show analysis results
  if (analysis) {
    const severityColor =
      analysis.severity === 'high' ? '#f87171' : analysis.severity === 'medium' ? '#fbbf24' : '#34d399';
    return (
      <div className="space-y-6 p-6 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `${severityColor}22` }}
          >
            {analysis.severity === 'high' ? (
              <AlertCircle size={24} style={{ color: severityColor }} />
            ) : (
              <CheckCircle size={24} style={{ color: severityColor }} />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>AI Photo Analysis Complete</h3>
            <p style={{ color: severityColor }}>
              Severity: {analysis.severity.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>{analysis.summary}</p>
        </div>

        {/* Defects */}
        {analysis.defects.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Issues Detected:</h4>
            <div className="space-y-3">
              {analysis.defects.map((defect, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-2 rounded-full mt-2"
                      style={{ background: defect.severity === 'high' ? '#f87171' : '#fbbf24' }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize" style={{ color: 'var(--color-text)' }}>
                        {defect.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
                        Confidence: {Math.round(defect.confidence * 100)}%
                      </p>
                      {defect.recommendations.length > 0 && (
                        <div className="mt-2 text-xs space-y-1">
                          <p className="font-medium" style={{ color: 'var(--color-text-3)' }}>Recommendations:</p>
                          <ul className="list-disc list-inside" style={{ color: 'var(--color-text-3)' }}>
                            {defect.recommendations.map((rec, ridx) => (
                              <li key={ridx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detected Objects */}
        {analysis.detectedObjects.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Identified Components:</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.detectedObjects.slice(0, 8).map((obj, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}
                >
                  {obj.label} ({Math.round(obj.confidence * 100)}%)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Consultation Notice */}
        {analysis.requiresVideoConsultation && (
          <div className="p-4 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <p className="text-sm font-medium" style={{ color: '#a5b4fc' }}>
              💡 Video Consultation Recommended
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
              For accurate assessment and quote, we recommend scheduling a quick
              15-minute video call with the contractor to discuss findings.
            </p>
          </div>
        )}

        {/* Next Steps */}
        <div className="p-4 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <p className="text-sm font-medium" style={{ color: '#6ee7b7' }}>Next Steps:</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
            This analysis will be shared with contractors when they view your
            job. They can provide a more accurate quote based on these findings.
            {analysis.requiresVideoConsultation &&
              ' Request a video consultation for a detailed discussion.'}
          </p>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            setAnalysis(null);
            setUploadedUrls([]);
          }}
          className="btn btn-secondary btn-full"
        >
          Analyze Different Photos
        </button>
      </div>
    );
  }

  // Show upload interface
  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className="rounded-xl p-8 text-center transition cursor-pointer"
        style={{
          border: '2px dashed var(--color-border)',
          background: uploadProgress > 0 ? 'rgba(99,102,241,0.06)' : 'transparent',
        }}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoUpload}
          disabled={isAnalyzing}
          className="hidden"
          id="photo-input"
        />
        <label
          htmlFor="photo-input"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          <Camera size={32} style={{ color: '#818cf8' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              {uploadedUrls.length > 0
                ? `${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} selected`
                : 'Take photos of the problem area'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
              Upload 3-5 clear photos showing the issue from different angles
            </p>
          </div>
        </label>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-4 w-full rounded-full h-2" style={{ background: 'var(--color-surface-2)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%`, background: '#6366f1' }}
            />
          </div>
        )}
      </div>

      {/* Uploaded Photos Preview */}
      {uploadedUrls.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-2)' }}>
            Uploaded Photos ({uploadedUrls.length}/10)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {uploadedUrls.map((url, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  onClick={() =>
                    setUploadedUrls(uploadedUrls.filter((_, i) => i !== idx))
                  }
                  className="absolute top-1 right-1 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                  style={{ background: 'var(--color-error, #ef4444)' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={uploadedUrls.length === 0 || isAnalyzing}
        className="btn btn-primary btn-full"
      >
        {isAnalyzing ? (
          <>
            <Loader size={18} className="animate-spin" />
            Analyzing with AI...
          </>
        ) : (
          <>
            <Upload size={18} />
            Analyze Photos ({uploadedUrls.length}/10)
          </>
        )}
      </button>

      {/* Tips */}
      <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-3)' }}>
        <p className="font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>📸 Photo Tips:</p>
        <ul className="space-y-1 text-xs">
          <li>✓ Show the problem area clearly</li>
          <li>✓ Take photos from different angles</li>
          <li>✓ Include context (full fixture, area around problem)</li>
          <li>✓ Good lighting helps AI detection</li>
        </ul>
      </div>
    </div>
  );
}
