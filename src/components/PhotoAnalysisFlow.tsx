'use client';

import { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Camera, Loader, Mic, Square, Video, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { WavRecorder } from '@/lib/wavRecorder';
import { extractVideoFrames } from '@/lib/videoFrames';
import type { PhotoAnalysisResponse } from '@/app/api/jobs/[jobId]/analyze-photos/route';
import type { AudioDiagnosisResult } from '@/lib/audioDiagnosis';

type Props = {
  jobId: string;
  trade?: string;
  onAnalysisComplete?: (analysis: PhotoAnalysisResponse) => void;
};

type Mode = 'photo' | 'video' | 'audio';

const MAX_RECORDING_SECONDS = 20;

async function uploadFileToCloudinary(file: File | Blob, authToken: string): Promise<string> {
  const cloudinaryResponse = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!cloudinaryResponse.ok) throw new Error('Failed to get upload signature');

  const { signature, timestamp, apiKey, cloudName, folder } = await cloudinaryResponse.json();

  const uploadFormData = new FormData();
  uploadFormData.append('file', file);
  uploadFormData.append('signature', signature);
  uploadFormData.append('timestamp', timestamp);
  uploadFormData.append('api_key', apiKey);
  uploadFormData.append('folder', folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: uploadFormData,
  });
  const uploaded = await uploadRes.json();
  if (!uploaded.secure_url) throw new Error('Upload failed');
  return uploaded.secure_url as string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is "data:audio/wav;base64,XXXX" — strip the prefix
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function PhotoAnalysisFlow({
  jobId,
  trade,
  onAnalysisComplete,
}: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('photo');
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingVideo, setProcessingVideo] = useState(false);

  // Audio mode state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioDiagnosisResult | null>(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const recorderRef = useRef<WavRecorder | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        newUrls.push(await uploadFileToCloudinary(files[i], authToken));
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload one or more photos');
    }

    setUploadedUrls((prev) => [...prev, ...newUrls]);
    setUploadProgress(0);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError('');
    setProcessingVideo(true);
    try {
      const frames = await extractVideoFrames(file, 4);
      if (frames.length === 0) throw new Error('Could not extract frames from that video.');

      const authToken = await user.getIdToken();
      const newUrls: string[] = [];
      for (let i = 0; i < frames.length; i++) {
        setUploadProgress(Math.round(((i + 1) / frames.length) * 100));
        newUrls.push(await uploadFileToCloudinary(frames[i], authToken));
      }
      setUploadedUrls((prev) => [...prev, ...newUrls]);
    } catch (err) {
      console.error('Error processing video:', err);
      setError(err instanceof Error ? err.message : 'Failed to process that video');
    } finally {
      setProcessingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleAnalyze = async () => {
    if (uploadedUrls.length === 0) {
      setError(mode === 'video' ? 'Please add a video first' : 'Please upload at least one photo');
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

  /* ── Audio recording ── */
  const startRecording = async () => {
    setError('');
    setAudioAnalysis(null);
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            stopRecordingAndAnalyze();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Could not access your microphone. Check your browser permissions.');
    }
  };

  const stopRecordingAndAnalyze = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const recorder = recorderRef.current;
    if (!recorder || !user) return;

    setIsRecording(false);
    const wavBlob = recorder.stop();
    recorderRef.current = null;

    setIsAnalyzingAudio(true);
    setError('');
    try {
      const audioBase64 = await blobToBase64(wavBlob);
      const token = await user.getIdToken();
      const response = await fetch(`/api/jobs/${jobId}/analyze-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ audioBase64 }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? 'Failed to analyze the recording');
      }
      const { data } = await response.json();
      setAudioAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze the recording');
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  /* ── Mode tabs ── */
  const ModeTabs = (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {([
        { id: 'photo' as Mode, icon: ImageIcon, label: 'Photo' },
        { id: 'video' as Mode, icon: Video, label: 'Video' },
        { id: 'audio' as Mode, icon: Mic, label: 'Sound' },
      ]).map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => { setMode(id); setError(''); }}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
          style={{
            background: mode === id ? 'rgba(99,102,241,0.12)' : 'var(--color-surface)',
            border: `1px solid ${mode === id ? 'rgba(99,102,241,0.4)' : 'var(--color-border)'}`,
          }}
        >
          <Icon size={18} style={{ color: mode === id ? '#818cf8' : 'var(--color-text-4)' }} />
          <span className="text-xs font-medium" style={{ color: mode === id ? '#818cf8' : 'var(--color-text-4)' }}>{label}</span>
        </button>
      ))}
    </div>
  );

  /* ── Shared result renderer for photo/video findings ── */
  if (mode !== 'audio' && analysis) {
    const severityColor =
      analysis.severity === 'high' ? '#f87171' : analysis.severity === 'medium' ? '#fbbf24' : '#34d399';
    return (
      <div className="space-y-6 p-6 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${severityColor}22` }}>
            {analysis.severity === 'high' ? <AlertCircle size={24} style={{ color: severityColor }} /> : <CheckCircle size={24} style={{ color: severityColor }} />}
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>AI Analysis Complete</h3>
            <p style={{ color: severityColor }}>Severity: {analysis.severity.toUpperCase()}</p>
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>{analysis.summary}</p>
        </div>

        {analysis.defects.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Issues Detected:</h4>
            <div className="space-y-3">
              {analysis.defects.map((defect, idx) => (
                <div key={idx} className="p-3 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-2" style={{ background: defect.severity === 'high' ? '#f87171' : '#fbbf24' }} />
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize" style={{ color: 'var(--color-text)' }}>{defect.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>Confidence: {Math.round(defect.confidence * 100)}%</p>
                      {defect.recommendations.length > 0 && (
                        <div className="mt-2 text-xs space-y-1">
                          <p className="font-medium" style={{ color: 'var(--color-text-3)' }}>Recommendations:</p>
                          <ul className="list-disc list-inside" style={{ color: 'var(--color-text-3)' }}>
                            {defect.recommendations.map((rec, ridx) => <li key={ridx}>{rec}</li>)}
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

        {analysis.detectedObjects.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Identified Components:</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.detectedObjects.slice(0, 8).map((obj, idx) => (
                <div key={idx} className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>
                  {obj.label} ({Math.round(obj.confidence * 100)}%)
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.requiresVideoConsultation && (
          <div className="p-4 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <p className="text-sm font-medium" style={{ color: '#a5b4fc' }}>💡 Video Consultation Recommended</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
              For accurate assessment and quote, we recommend scheduling a quick 15-minute video call with the contractor to discuss findings.
            </p>
          </div>
        )}

        <div className="p-4 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <p className="text-sm font-medium" style={{ color: '#6ee7b7' }}>Next Steps:</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
            This analysis will be shared with contractors when they view your job. They can provide a more accurate quote based on these findings.
            {analysis.requiresVideoConsultation && ' Request a video consultation for a detailed discussion.'}
          </p>
        </div>

        <button
          onClick={() => { setAnalysis(null); setUploadedUrls([]); }}
          className="btn btn-secondary btn-full"
        >
          Analyze Something Else
        </button>
      </div>
    );
  }

  /* ── Audio result ── */
  if (mode === 'audio' && audioAnalysis) {
    const severityColor =
      audioAnalysis.estimatedSeverity === 'high' ? '#f87171' : audioAnalysis.estimatedSeverity === 'medium' ? '#fbbf24' : '#34d399';
    return (
      <div className="space-y-6 p-6 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${severityColor}22` }}>
            <Mic size={22} style={{ color: severityColor }} />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>AI Sound Analysis Complete</h3>
            <p style={{ color: severityColor }}>Severity: {audioAnalysis.estimatedSeverity.toUpperCase()}</p>
          </div>
        </div>

        {audioAnalysis.soundDescription && (
          <div className="p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-4)' }}>What AI heard:</p>
            <p className="text-sm italic" style={{ color: 'var(--color-text-2)' }}>&ldquo;{audioAnalysis.soundDescription}&rdquo;</p>
          </div>
        )}

        <div className="p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>{audioAnalysis.summary}</p>
        </div>

        {audioAnalysis.detectedDefects.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Likely Cause:</h4>
            <div className="space-y-3">
              {audioAnalysis.detectedDefects.map((defect, idx) => (
                <div key={idx} className="p-3 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-2" style={{ background: defect.severity === 'high' ? '#f87171' : '#fbbf24' }} />
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize" style={{ color: 'var(--color-text)' }}>{defect.defectType.replace(/_/g, ' ')}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>{defect.description}</p>
                      {defect.recommendations.length > 0 && (
                        <div className="mt-2 text-xs space-y-1">
                          <p className="font-medium" style={{ color: 'var(--color-text-3)' }}>Recommendations:</p>
                          <ul className="list-disc list-inside" style={{ color: 'var(--color-text-3)' }}>
                            {defect.recommendations.map((rec, ridx) => <li key={ridx}>{rec}</li>)}
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

        <button onClick={() => setAudioAnalysis(null)} className="btn btn-secondary btn-full">
          Record Something Else
        </button>
      </div>
    );
  }

  /* ── Capture interface ── */
  return (
    <div className="space-y-4">
      {ModeTabs}

      {mode === 'photo' && (
        <div
          className="rounded-xl p-8 text-center transition cursor-pointer"
          style={{ border: '2px dashed var(--color-border)', background: uploadProgress > 0 ? 'rgba(99,102,241,0.06)' : 'transparent' }}
        >
          <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={isAnalyzing} className="hidden" id="photo-input" />
          <label htmlFor="photo-input" className="cursor-pointer flex flex-col items-center gap-3">
            <Camera size={32} style={{ color: '#818cf8' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                {uploadedUrls.length > 0 ? `${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} selected` : 'Take photos of the problem area'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>Upload 3-5 clear photos showing the issue from different angles</p>
            </div>
          </label>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4 w-full rounded-full h-2" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: '#6366f1' }} />
            </div>
          )}
        </div>
      )}

      {mode === 'video' && (
        <div
          className="rounded-xl p-8 text-center transition cursor-pointer"
          style={{ border: '2px dashed var(--color-border)', background: (uploadProgress > 0 || processingVideo) ? 'rgba(99,102,241,0.06)' : 'transparent' }}
        >
          <input type="file" accept="video/*" capture="environment" onChange={handleVideoUpload} disabled={isAnalyzing || processingVideo} className="hidden" id="video-input" />
          <label htmlFor="video-input" className="cursor-pointer flex flex-col items-center gap-3">
            <Video size={32} style={{ color: '#818cf8' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                {processingVideo
                  ? 'Extracting frames…'
                  : uploadedUrls.length > 0 ? `${uploadedUrls.length} frame${uploadedUrls.length > 1 ? 's' : ''} captured from video` : 'Record or upload a short video'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
                Pan slowly around the problem area, 5-15 seconds is plenty
              </p>
            </div>
          </label>
          {(processingVideo || (uploadProgress > 0 && uploadProgress < 100)) && (
            <div className="mt-4 w-full rounded-full h-2" style={{ background: 'var(--color-surface-2)' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${uploadProgress || 30}%`, background: '#6366f1' }} />
            </div>
          )}
        </div>
      )}

      {mode === 'audio' && (
        <div className="rounded-xl p-8 text-center" style={{ border: '2px dashed var(--color-border)' }}>
          {isAnalyzingAudio ? (
            <div className="flex flex-col items-center gap-3">
              <Loader size={32} className="animate-spin" style={{ color: '#818cf8' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Listening and diagnosing…</p>
            </div>
          ) : isRecording ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={stopRecordingAndAnalyze}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all animate-pulse"
                style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444' }}
              >
                <Square size={22} style={{ color: '#ef4444' }} fill="#ef4444" />
              </button>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Recording… {recordSeconds}s / {MAX_RECORDING_SECONDS}s
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Hold your phone near the noise, tap to stop</p>
            </div>
          ) : (
            <button onClick={startRecording} className="flex flex-col items-center gap-3 w-full">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
                <Mic size={28} style={{ color: '#818cf8' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Record the noise</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
                  Grinding, dripping, humming — AI listens and diagnoses it, up to {MAX_RECORDING_SECONDS}s
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Uploaded photo/frame previews (photo + video modes) */}
      {mode !== 'audio' && uploadedUrls.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-2)' }}>
            {mode === 'video' ? 'Captured Frames' : 'Uploaded Photos'} ({uploadedUrls.length}/10)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {uploadedUrls.map((url, idx) => (
              <div key={idx} className="relative group">
                <img src={url} alt={`Frame ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                <button
                  onClick={() => setUploadedUrls(uploadedUrls.filter((_, i) => i !== idx))}
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

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {mode !== 'audio' && (
        <button
          onClick={handleAnalyze}
          disabled={uploadedUrls.length === 0 || isAnalyzing || processingVideo}
          className="btn btn-primary btn-full"
        >
          {isAnalyzing ? (
            <><Loader size={18} className="animate-spin" /> Analyzing with AI...</>
          ) : (
            <><Upload size={18} /> Analyze {mode === 'video' ? 'Video' : 'Photos'} ({uploadedUrls.length}/10)</>
          )}
        </button>
      )}

      {mode === 'photo' && (
        <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--color-text-3)' }}>
          <p className="font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>📸 Photo Tips:</p>
          <ul className="space-y-1 text-xs">
            <li>✓ Show the problem area clearly</li>
            <li>✓ Take photos from different angles</li>
            <li>✓ Include context (full fixture, area around problem)</li>
            <li>✓ Good lighting helps AI detection</li>
          </ul>
        </div>
      )}
    </div>
  );
}
