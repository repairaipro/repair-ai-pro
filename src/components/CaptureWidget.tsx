'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { storage, db } from '@/lib/db';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { logJobEvent } from '@/lib/logEvent';
import VoiceRecorder from '@/components/VoiceRecorder';

interface Props {
  jobId: string;
  /** Voice transcript piped back to parent's text input */
  onTranscript: (text: string) => void;
  /** Called after a successful upload with the public URL + mime type */
  onUploadComplete?: (url: string, mime: string) => void;
  disabled?: boolean;
}

export default function CaptureWidget({
  jobId,
  onTranscript,
  onUploadComplete,
  disabled = false,
}: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [flashMsg, setFlashMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setFlashMsg({ ok, text });
    setTimeout(() => setFlashMsg(null), 3500);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    if (file.size > 50 * 1024 * 1024) {
      flash(false, 'File must be under 50 MB');
      return;
    }

    setUploading(true);
    try {
      const path = `attachments/${jobId}/${Date.now()}-${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      const kind = file.type.startsWith('image') ? 'photo'
                 : file.type.startsWith('video') ? 'video'
                 : file.type.startsWith('audio') ? 'audio'
                 : 'file';

      // Save to Firestore
      await addDoc(collection(db, 'jobs', jobId, 'attachments'), {
        fileUrl: url,
        name: file.name,
        type: kind,
        mime: file.type,
        stage: 'progress',
        uploadedBy: user.uid,
        createdAt: serverTimestamp(),
      });

      await logJobEvent(jobId, user.uid, 'attachment_added', {
        message: `${kind} uploaded`,
        fileUrl: url,
        name: file.name,
      });

      // Fire AI analysis in background (don't await — don't block UX)
      const token = await user.getIdToken();
      fetch('/api/analyze-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jobId,
          attachmentUrl: file.type.startsWith('image') ? url : undefined,
          audioUrl: file.type.startsWith('audio') ? url : undefined,
          videoUrl: file.type.startsWith('video') ? url : undefined,
          text: `User uploaded a ${kind} showing the issue.`,
        }),
      }).catch(() => {/* silent */});

      onUploadComplete?.(url, file.type);
      flash(true, `${kind} attached ✓`);
    } catch (err: any) {
      flash(false, err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*"
        capture="environment"
        onChange={handleFile}
      />

      {/* Camera / attachment button */}
      <button
        type="button"
        title="Attach photo or video"
        disabled={disabled || uploading}
        onClick={() => fileRef.current?.click()}
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 flex-shrink-0"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: uploading ? 'var(--color-brand)' : 'var(--color-text-3)',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={e => {
          if (!disabled && !uploading)
            (e.currentTarget as HTMLElement).style.color = 'var(--color-brand)';
        }}
        onMouseLeave={e => {
          if (!uploading)
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)';
        }}
      >
        {uploading
          ? <Loader2 size={16} className="animate-spin" />
          : <Camera size={16} />}
      </button>

      {/* Voice recorder — transcribes via Whisper, pipes text to parent */}
      <VoiceRecorder
        onTranscript={onTranscript}
        onError={(msg) => flash(false, msg)}
        size="sm"
        disabled={disabled}
      />

      {/* Flash status */}
      {flashMsg && (
        <span
          className="flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
          style={{ color: flashMsg.ok ? 'var(--color-success)' : 'var(--color-error)' }}
        >
          {flashMsg.ok
            ? <CheckCircle2 size={11} />
            : <XCircle size={11} />}
          {flashMsg.text}
        </span>
      )}
    </div>
  );
}
