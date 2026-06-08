'use client';

import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Camera, Loader } from 'lucide-react';
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
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    setError('');
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));

      try {
        // Use Cloudinary upload (assuming already configured)
        const formData = new FormData();
        formData.append('file', file);

        const cloudinaryResponse = await fetch('/api/cloudinary/sign', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            bytes: file.size,
          }),
        });

        const { signature, timestamp, cloudName, folder } =
          await cloudinaryResponse.json();

        // Upload to Cloudinary
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('signature', signature);
        uploadFormData.append('timestamp', timestamp);
        uploadFormData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_KEY || '');
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
      } catch (err) {
        console.error('Error uploading photo:', err);
        setError('Failed to upload one or more photos');
      }
    }

    setUploadedUrls([...uploadedUrls, ...newUrls]);
    setUploadProgress(0);
  };

  const handleAnalyze = async () => {
    if (uploadedUrls.length === 0) {
      setError('Please upload at least one photo');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const token = await (window as any).gapi?.auth2
        ?.getAuthInstance()
        ?.currentUser?.get()
        ?.getAuthResponse()?.id_token;

      if (!token) {
        setError('Authentication required');
        return;
      }

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
          errorData.message || 'Failed to analyze photos'
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
    return (
      <div className="space-y-6 p-6 bg-white rounded-xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background:
                analysis.severity === 'high'
                  ? '#fee2e2'
                  : analysis.severity === 'medium'
                  ? '#fef3c7'
                  : '#d1fae5',
            }}
          >
            {analysis.severity === 'high' ? (
              <AlertCircle
                size={24}
                style={{ color: '#dc2626' }}
              />
            ) : (
              <CheckCircle
                size={24}
                style={{ color: '#10b981' }}
              />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg">AI Photo Analysis Complete</h3>
            <p
              style={{
                color:
                  analysis.severity === 'high'
                    ? '#dc2626'
                    : analysis.severity === 'medium'
                    ? '#f59e0b'
                    : '#10b981',
              }}
            >
              Severity: {analysis.severity.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm">{analysis.summary}</p>
        </div>

        {/* Defects */}
        {analysis.defects.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Issues Detected:</h4>
            <div className="space-y-3">
              {analysis.defects.map((defect, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-2 rounded-full mt-2"
                      style={{
                        background:
                          defect.severity === 'high'
                            ? '#dc2626'
                            : '#f59e0b',
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize">
                        {defect.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Confidence: {Math.round(defect.confidence * 100)}%
                      </p>
                      {defect.recommendations.length > 0 && (
                        <div className="mt-2 text-xs space-y-1">
                          <p className="font-medium">Recommendations:</p>
                          <ul className="list-disc list-inside text-gray-700">
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
            <h4 className="font-semibold mb-2">Identified Components:</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.detectedObjects.slice(0, 8).map((obj, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 bg-blue-50 rounded-full text-xs"
                  style={{ color: '#0c63e4' }}
                >
                  {obj.label} ({Math.round(obj.confidence * 100)}%)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Consultation Notice */}
        {analysis.requiresVideoConsultation && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              💡 Video Consultation Recommended
            </p>
            <p className="text-xs text-blue-800 mt-1">
              For accurate assessment and quote, we recommend scheduling a quick
              15-minute video call with the contractor to discuss findings.
            </p>
          </div>
        )}

        {/* Next Steps */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900">Next Steps:</p>
          <p className="text-xs text-green-800 mt-1">
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
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition"
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
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer"
        style={{
          background: uploadProgress > 0 ? '#f0f9ff' : 'transparent',
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
          <Camera size={32} style={{ color: '#0c63e4' }} />
          <div>
            <p className="font-semibold text-sm">
              {uploadedUrls.length > 0
                ? `${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} selected`
                : 'Take photos of the problem area'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Upload 3-5 clear photos showing the issue from different angles
            </p>
          </div>
        </label>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Uploaded Photos Preview */}
      {uploadedUrls.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
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
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
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
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={uploadedUrls.length === 0 || isAnalyzing}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
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
      <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
        <p className="font-medium mb-1">📸 Photo Tips:</p>
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
