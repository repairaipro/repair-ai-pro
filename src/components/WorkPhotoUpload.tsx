'use client';

import { useState, useRef, useCallback } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth';
import {
  Camera, Upload, X, Loader2, CheckCircle2,
  Image as ImageIcon, AlertCircle,
} from 'lucide-react';

type Stage = 'diagnosis' | 'in-progress' | 'completed';

const STAGE_OPTIONS: { value: Stage; label: string; color: string }[] = [
  { value: 'diagnosis',   label: 'Diagnosis',   color: '#fbbf24' },
  { value: 'in-progress', label: 'In Progress',  color: '#fb923c' },
  { value: 'completed',   label: 'Completed',    color: '#22c55e' },
];

type UploadedPhoto = {
  id: string;
  url: string;
  caption: string;
  stage: Stage;
  uploadedAt?: any;
};

type Props = {
  jobId: string;
  /** 'contractor' can upload during in_progress; 'homeowner' can upload dispute evidence */
  role: 'contractor' | 'homeowner';
  photos?: UploadedPhoto[];
  onPhotoAdded?: (photo: UploadedPhoto) => void;
};

export default function WorkPhotoUpload({ jobId, role, photos = [], onPhotoAdded }: Props) {
  const { user } = useAuth();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [stage,    setStage]    = useState<Stage>('in-progress');
  const [caption,  setCaption]  = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }
    setSelectedFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearSelection() {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  }

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    setError(null);
    try {
      // Upload to Firebase Storage
      const storage   = getStorage();
      const storageRef = ref(storage, `jobs/${jobId}/work-photos/${Date.now()}_${selectedFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      const url = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)),
        );
      });

      // Save to API
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/work-photos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ url, caption: caption.trim(), stage }),
      });

      if (!res.ok) throw new Error('Failed to save photo');
      const data = await res.json();

      onPhotoAdded?.({ id: data.photoId, url, caption: caption.trim(), stage });
      clearSelection();
    } catch (err: any) {
      setError(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [selectedFile, user, jobId, caption, stage, onPhotoAdded]);

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {role === 'contractor' ? 'Work Photos' : 'Evidence Photos'}
        </h3>
        <span className="text-xs ml-auto" style={{ color: 'var(--color-text-4)' }}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Existing photos grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => {
            const stageInfo = STAGE_OPTIONS.find((s) => s.value === p.stage);
            return (
              <div key={p.id} className="relative group">
                <img
                  src={p.url}
                  alt={p.caption || 'Work photo'}
                  className="w-full h-24 object-cover rounded-xl"
                  style={{ border: '1px solid var(--color-border)' }}
                />
                {stageInfo && (
                  <span
                    className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${stageInfo.color}22`,
                      color: stageInfo.color,
                      border: `1px solid ${stageInfo.color}44`,
                    }}
                  >
                    {stageInfo.label}
                  </span>
                )}
                {p.caption && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
                  >
                    <p className="text-[10px] text-white leading-snug line-clamp-2">{p.caption}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload form */}
      {!selectedFile ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-5 rounded-xl transition-colors"
          style={{
            border: '1.5px dashed var(--color-border)',
            background: 'var(--color-surface-2)',
            cursor: 'pointer',
          }}
        >
          <Upload className="w-5 h-5" style={{ color: 'var(--color-text-4)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            Tap to add a photo
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
        </button>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative">
            <img
              src={preview!}
              alt="Preview"
              className="w-full h-40 object-cover rounded-xl"
              style={{ border: '1px solid var(--color-border)' }}
            />
            <button
              type="button"
              onClick={clearSelection}
              className="absolute top-2 right-2 p-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>

          {/* Stage */}
          <div className="flex gap-2">
            {STAGE_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStage(s.value)}
                className="flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all"
                style={
                  stage === s.value
                    ? { background: `${s.color}18`, color: s.color, border: `1.5px solid ${s.color}40` }
                    : { background: 'var(--color-surface-2)', color: 'var(--color-text-4)', border: '1px solid var(--color-border)' }
                }
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Caption */}
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            className="input text-sm"
          />

          {/* Upload progress */}
          {uploading && progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-4)' }}>
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: 'var(--color-brand)' }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#f87171' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="btn btn-primary btn-sm w-full"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Save Photo</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
