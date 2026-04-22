'use client';

import { useState } from 'react';
import { storage, db } from '@/lib/db';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { logJobEvent } from '@/lib/logEvent';

import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';

type Props = {
  jobId: string;
};

export default function CaptureWidget({ jobId }: Props) {
  const { user } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [manualPrompt, setManualPrompt] = useState('');
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  const [stage, setStage] = useState<'start' | 'progress' | 'completion'>(
    'progress'
  );

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  /* ---------------- PROMPT BUILDER ---------------- */

  function buildFinalPrompt(fileType?: string) {
    const voice = transcript.trim();
    const text = manualPrompt.trim();

    let context = '';

    if (fileType?.startsWith('image')) {
      context = 'The user uploaded a photo showing a maintenance issue.';
    }

    if (fileType?.startsWith('video')) {
      context =
        'The user uploaded a video showing a maintenance issue. Analyze what might be happening.';
    }

    if (fileType?.startsWith('audio')) {
      context =
        'The user uploaded an audio description of the issue. Interpret the spoken problem.';
    }

    if (fileType === 'application/pdf') {
      context =
        'The user uploaded a document related to the repair issue.';
    }

    const combinedNotes = [text, voice].filter(Boolean).join('\n');

    if (combinedNotes) {
      return `${context}\n\nUser notes:\n${combinedNotes}`;
    }

    return `${context}\n\nAnalyze the issue and describe repair needs clearly.`;
  }

  /* ---------------- FILE TYPE DETECTOR ---------------- */

  function detectAttachmentType(mime: string) {
    if (mime.startsWith('image')) return 'photo';
    if (mime.startsWith('video')) return 'video';
    if (mime.startsWith('audio')) return 'audio';
    if (mime === 'application/pdf') return 'document';
    return 'file';
  }

  /* ---------------- FILE UPLOAD ---------------- */

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setLastStatus('Please sign in before uploading.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setLastStatus(null);

    try {
      const type = detectAttachmentType(file.type);

      const storageRef = ref(
        storage,
        `attachments/${jobId}/${Date.now()}-${file.name}`
      );

      await uploadBytes(storageRef, file);

      const fileUrl = await getDownloadURL(storageRef);

      const attachmentDoc = await addDoc(
        collection(db, 'jobs', jobId, 'attachments'),
        {
          fileUrl,
          name: file.name,
          type,
          mime: file.type,
          stage,
          uploadedBy: user.uid,
          createdAt: serverTimestamp(),
        }
      );

      /* ---------------- EVENT LOG ---------------- */

      await logJobEvent(jobId, user.uid, 'attachment_added', {
        message: 'Attachment uploaded',
        attachmentId: attachmentDoc.id,
        fileUrl,
        name: file.name,
        stage,
        mime: file.type,
      });

      /* ---------------- AI ANALYSIS ---------------- */

      const prompt = buildFinalPrompt(file.type);
      const token = await user.getIdToken();

      try {
        await fetch('/api/analyze-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jobId,
            attachmentUrl: fileUrl,
            text: prompt,
            attachmentId: attachmentDoc.id,
            stage,
            mime: file.type,
          }),
        });
      } catch {
        console.warn('AI analysis request failed but upload succeeded.');
      }

      setLastStatus('Uploaded and added to job timeline.');
    } catch (err) {
      console.error(err);
      setLastStatus('Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  /* ---------------- SPEECH ---------------- */

  function toggleListening() {
    if (!browserSupportsSpeechRecognition) {
      alert('Speech recognition not supported.');
      return;
    }

    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="flex flex-col gap-3 text-sm text-gray-200">

      <div className="flex flex-wrap items-center gap-3">

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs"
        >
          <option value="start">🟢 Start</option>
          <option value="progress">🟡 Progress</option>
          <option value="completion">✅ Completion</option>
        </select>

        <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md">
          📎 Upload Photo / Video / Audio
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*,application/pdf"
            capture="environment"
          />
        </label>

        <button
          type="button"
          onClick={toggleListening}
          className={`px-4 py-2 rounded-md border ${
            listening
              ? 'bg-red-600/20 border-red-500 text-red-300'
              : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
          }`}
        >
          {listening ? '🎙️ Listening…' : '🎤 Speak'}
        </button>

        {uploading && (
          <span className="text-xs text-indigo-400">Uploading…</span>
        )}

        {!uploading && lastStatus && (
          <span className="text-xs text-gray-400">{lastStatus}</span>
        )}
      </div>

      <textarea
        className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-xs"
        rows={2}
        placeholder="Optional notes for AI or record keeping…"
        value={manualPrompt}
        onChange={(e) => setManualPrompt(e.target.value)}
      />

      {transcript && (
        <div className="bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-[11px]">
          <div className="flex justify-between mb-1">
            <span className="text-indigo-300 font-semibold">
              Voice Notes
            </span>

            <button
              type="button"
              className="text-gray-400 hover:text-gray-200"
              onClick={resetTranscript}
            >
              Clear
            </button>
          </div>

          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}