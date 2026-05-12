'use client';

import { useRef, useState, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

type RecordState = 'idle' | 'recording' | 'transcribing';

interface Props {
  onTranscript: (text: string) => void;
  onError?: (msg: string) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

// Pick the first MIME type the browser supports
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    '',
  ];
  return types.find((t) => !t || MediaRecorder.isTypeSupported(t)) ?? '';
}

export default function VoiceRecorder({ onTranscript, onError, size = 'md', disabled = false }: Props) {
  const [state, setState] = useState<RecordState>('idle');
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<BlobPart[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  const sizeCls = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  const iconCls = size === 'sm' ? 'w-4 h-4'  : size === 'lg' ? 'w-6 h-6'  : 'w-5 h-5';

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSeconds(0);
  };

  const startRecording = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const mimeType = getSupportedMimeType();
      const recorder  = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Release microphone immediately
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();

        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        });

        if (blob.size < 500) {
          setState('idle');
          onError?.('Recording too short — please speak for at least one second.');
          return;
        }

        setState('transcribing');

        try {
          const fd = new FormData();
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          fd.append('audio', blob, `recording.${ext}`);

          const res  = await fetch('/api/transcribe', { method: 'POST', body: fd });
          const data = await res.json();

          if (data.text?.trim()) {
            onTranscript(data.text.trim());
          } else {
            onError?.(data.error ?? 'Could not understand audio. Please try again.');
          }
        } catch (err: any) {
          onError?.(err.message ?? 'Transcription failed. Check your connection.');
        } finally {
          setState('idle');
        }
      };

      // Collect chunks every 250 ms for faster response
      recorder.start(250);
      setState('recording');

      // Running timer
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      // Auto-stop after 60 s
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 60_000);
    } catch (err: any) {
      setState('idle');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        onError?.('Microphone access denied. Enable mic permission in your browser settings, then try again.');
      } else {
        onError?.(err.message ?? 'Could not access microphone.');
      }
    }
  }, [disabled, onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleClick = () => {
    if (state === 'idle')      startRecording();
    else if (state === 'recording') stopRecording();
    // 'transcribing' — ignore clicks
  };

  const isRecording     = state === 'recording';
  const isTranscribing  = state === 'transcribing';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      aria-label={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing…' : 'Start voice input'}
      className={`relative flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 select-none ${sizeCls}`}
      style={{
        background: isRecording
          ? 'linear-gradient(135deg,#ef4444,#dc2626)'
          : isTranscribing
          ? 'rgba(99,102,241,0.12)'
          : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        border: isRecording
          ? '2px solid rgba(239,68,68,0.4)'
          : '2px solid transparent',
        boxShadow: isRecording
          ? '0 0 0 5px rgba(239,68,68,0.15), 0 0 24px rgba(239,68,68,0.25)'
          : isTranscribing
          ? 'none'
          : '0 0 18px rgba(99,102,241,0.35)',
        cursor: disabled || isTranscribing ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Animated pulse ring while recording */}
      {isRecording && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: 'rgba(239,68,68,0.25)', animationDuration: '1s' }}
        />
      )}

      {isTranscribing ? (
        <Loader2 className={`${iconCls} animate-spin`} style={{ color: '#818cf8' }} />
      ) : isRecording ? (
        <Square className={`${iconCls} fill-current`} style={{ color: '#fff' }} />
      ) : (
        <Mic className={iconCls} style={{ color: '#fff' }} />
      )}

      {/* Live timer badge */}
      {isRecording && seconds > 0 && (
        <span
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold whitespace-nowrap"
          style={{ color: '#f87171' }}
        >
          {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}
        </span>
      )}
    </button>
  );
}
