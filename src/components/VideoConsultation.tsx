'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Loader2,
  AlertCircle, Maximize2, Minimize2, Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface Props {
  jobId:     string;
  consultId: string;
  /** Display name shown on the remote video tile */
  remoteName?: string;
  onCallEnded?: () => void;
}

type CallState = 'idle' | 'joining' | 'connected' | 'ended' | 'error';

export default function VideoConsultation({ jobId, consultId, remoteName = 'Other participant', onCallEnded }: Props) {
  const { user }          = useAuth();
  const [callState, setCallState]   = useState<CallState>('idle');
  const [error, setError]           = useState('');
  const [micOn, setMicOn]           = useState(true);
  const [camOn, setCamOn]           = useState(true);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [duration, setDuration]     = useState(0);

  // Agora client + track refs — typed as any to avoid importing heavy types at module level
  const clientRef      = useRef<any>(null);
  const localAudioRef  = useRef<any>(null);
  const localVideoRef  = useRef<any>(null);
  const localVideoEl   = useRef<HTMLDivElement>(null);
  const remoteVideoEl  = useRef<HTMLDivElement>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  const endCall = useCallback(async (notify = true) => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      localAudioRef.current?.close();
      localVideoRef.current?.close();
      await clientRef.current?.leave();
    } catch { /* ignore cleanup errors */ }

    setCallState('ended');

    if (notify && user) {
      const token = await user.getIdToken().catch(() => '');
      fetch(`/api/jobs/${jobId}/video-consultation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ action: 'complete', consultId }),
      }).catch(() => {});
    }

    onCallEnded?.();
  }, [user, jobId, consultId, onCallEnded]);

  const joinCall = useCallback(async () => {
    if (!user) return;
    setCallState('joining');
    setError('');

    try {
      // Dynamic import keeps Agora SDK out of the SSR bundle
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;

      // Fetch token from our server
      const idToken = await user.getIdToken();
      const res = await fetch('/api/video/generate-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body:    JSON.stringify({ consultId, jobId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Could not get call token');
      }
      const { token, uid, appId, channelName } = await res.json();

      // Create client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // Remote user events
      client.on('user-published', async (remoteUser: any, mediaType: 'audio' | 'video') => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === 'video' && remoteVideoEl.current) {
          remoteUser.videoTrack?.play(remoteVideoEl.current);
        }
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.play();
        }
        setRemoteJoined(true);
      });

      client.on('user-unpublished', (_: any, mediaType: string) => {
        if (mediaType === 'video') setRemoteJoined(false);
      });

      client.on('user-left', () => setRemoteJoined(false));

      // Join channel
      await client.join(appId, channelName, token, uid);

      // Create + publish local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioRef.current = audioTrack;
      localVideoRef.current = videoTrack;

      if (localVideoEl.current) {
        videoTrack.play(localVideoEl.current);
      }

      await client.publish([audioTrack, videoTrack]);

      setCallState('connected');

      // Start duration timer
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err: any) {
      console.error('Agora join error:', err);
      setError(err.message ?? 'Failed to join the call');
      setCallState('error');
    }
  }, [user, consultId, jobId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { endCall(false); };
  }, [endCall]);

  async function toggleMic() {
    if (!localAudioRef.current) return;
    if (micOn) {
      await localAudioRef.current.setEnabled(false);
    } else {
      await localAudioRef.current.setEnabled(true);
    }
    setMicOn((v) => !v);
  }

  async function toggleCam() {
    if (!localVideoRef.current) return;
    if (camOn) {
      await localVideoRef.current.setEnabled(false);
    } else {
      await localVideoRef.current.setEnabled(true);
    }
    setCamOn((v) => !v);
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /* ── Idle / Pre-join screen ── */
  if (callState === 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'rgba(17,24,39,0.95)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 20,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Video size={28} color="#818cf8" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#f9fafb' }}>
          Pre-Bid Video Consultation
        </h2>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
          A 15-minute video call to discuss the job before submitting a bid.
          Both parties will use camera and microphone.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          {[
            { icon: <Mic size={16} />, label: 'Microphone' },
            { icon: <Video size={16} />, label: 'Camera' },
            { icon: <Users size={16} />, label: '1-on-1 call' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9ca3af' }}>
              {icon} {label}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={joinCall}
          style={{
            padding: '14px 36px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Video size={18} /> Join Call
        </button>
      </motion.div>
    );
  }

  /* ── Joining ── */
  if (callState === 'joining') {
    return (
      <div style={{ background: '#111827', borderRadius: 20, padding: 48, textAlign: 'center' }}>
        <Loader2 size={36} color="#818cf8" style={{ margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#9ca3af', fontSize: 15 }}>Connecting to call…</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Error ── */
  if (callState === 'error') {
    return (
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, textAlign: 'center' }}>
        <AlertCircle size={32} color="#ef4444" style={{ margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: '#fca5a5', fontWeight: 600, marginBottom: 8 }}>Could not join the call</p>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>{error}</p>
        <button
          type="button"
          onClick={() => { setCallState('idle'); setError(''); }}
          style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#e5e7eb', cursor: 'pointer', fontSize: 14 }}
        >
          Try Again
        </button>
      </div>
    );
  }

  /* ── Ended ── */
  if (callState === 'ended') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ background: '#111827', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 20, padding: 40, textAlign: 'center' }}
      >
        <PhoneOff size={36} color="#34d399" style={{ margin: '0 auto 16px', display: 'block' }} />
        <p style={{ color: '#34d399', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Call ended</p>
        <p style={{ color: '#6b7280', fontSize: 13 }}>Duration: {formatDuration(duration)}</p>
      </motion.div>
    );
  }

  /* ── Active call UI ── */
  return (
    <div
      style={{
        background: '#0a0f1a',
        borderRadius: fullscreen ? 0 : 20,
        overflow: 'hidden',
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : 'auto',
        zIndex: fullscreen ? 9999 : 'auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: fullscreen ? '100vh' : 480,
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, color: '#9ca3af' }}>Live • {formatDuration(duration)}</span>
        </div>
        <span style={{ fontSize: 13, color: '#6b7280' }}>Pre-Bid Consultation</span>
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Video grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, minHeight: 0 }}>
        {/* Remote video */}
        <div style={{ position: 'relative', background: '#111827', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
          <div ref={remoteVideoEl} style={{ width: '100%', height: '100%' }} />
          {!remoteJoined && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} color="#4b5563" />
              </div>
              <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>Waiting for {remoteName}…</p>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 12, color: '#d1d5db', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 6 }}>
            {remoteName}
          </div>
        </div>

        {/* Local video */}
        <div style={{ position: 'relative', background: '#0f172a', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
          <div ref={localVideoEl} style={{ width: '100%', height: '100%' }} />
          {!camOn && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
              <VideoOff size={28} color="#4b5563" />
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 12, color: '#d1d5db', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 6 }}>
            You
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '16px 20px', background: 'rgba(0,0,0,0.5)' }}>
        {/* Mic */}
        <button
          type="button"
          onClick={toggleMic}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: micOn ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.25)',
            border: micOn ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(239,68,68,0.5)',
            color: micOn ? '#e5e7eb' : '#f87171',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* End call */}
        <button
          type="button"
          onClick={() => endCall(true)}
          style={{
            width: 60, height: 60, borderRadius: '50%',
            background: '#dc2626',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(220,38,38,0.4)',
          }}
        >
          <PhoneOff size={24} />
        </button>

        {/* Camera */}
        <button
          type="button"
          onClick={toggleCam}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: camOn ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.25)',
            border: camOn ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(239,68,68,0.5)',
            color: camOn ? '#e5e7eb' : '#f87171',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </div>
  );
}
