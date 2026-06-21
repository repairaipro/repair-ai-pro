'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth';
import { TRADES } from '@/lib/constants';
import {
  Camera, X, Loader2, Send, ArrowLeft, AlertCircle, ImagePlus, Sparkles, Video, Film,
} from 'lucide-react';

type Slot = { file: File; preview: string };
const MAX_VIDEO_MB = 60;

export default function NewWorkPostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const [slots, setSlots]         = useState<Slot[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption]     = useState('');
  const [trade, setTrade]         = useState('');
  const [beforeAfter, setBeforeAfter] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [progress, setProgress]   = useState('');
  const [error, setError]         = useState('');

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - slots.length);
    for (const file of files) {
      if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) continue;
      const reader = new FileReader();
      reader.onloadend = () =>
        setSlots((prev) => prev.length < 4 ? [...prev, { file, preview: reader.result as string }] : prev);
      reader.readAsDataURL(file);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function addVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { setError('Please choose a video file.'); return; }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { setError(`Video must be under ${MAX_VIDEO_MB} MB.`); return; }
    setError('');
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    if (videoRef.current) videoRef.current.value = '';
  }

  const hasContent = slots.length > 0 || !!videoFile;

  async function handleSubmit() {
    if (!user || !hasContent) return;
    setSubmitting(true);
    setError('');
    try {
      const storage = getStorage();

      async function upload(file: File, key: string): Promise<string> {
        const sRef = ref(storage, `posts/${user!.uid}/${Date.now()}_${key}_${file.name}`);
        const task = uploadBytesResumable(sRef, file);
        return new Promise<string>((resolve, reject) => {
          task.on('state_changed',
            (snap) => setProgress(`Uploading ${key}… ${Math.round((snap.bytesTransferred / snap.totalBytes) * 100)}%`),
            reject,
            async () => resolve(await getDownloadURL(task.snapshot.ref)));
        });
      }

      // Photos
      const urls: string[] = [];
      for (let i = 0; i < slots.length; i++) {
        urls.push(await upload(slots[i].file, `photo${i + 1}`));
      }

      // Video
      let videoUrl: string | null = null;
      if (videoFile) videoUrl = await upload(videoFile, 'video');

      setProgress('Publishing…');
      const token = await user.getIdToken();
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caption: caption.trim(), trade, photos: urls, video: videoUrl, beforeAfter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to publish');

      router.push(data.postId ? `/work/${data.postId}` : '/work');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setSubmitting(false);
      setProgress('');
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="card p-8 text-center max-w-sm w-full">
          <Camera className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-brand)' }} />
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Share your work</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-3)' }}>
            Sign in with your contractor account to post photos of your work.
          </p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

        <Link href="/work" className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-4)' }}>
          <ArrowLeft className="w-4 h-4" /> Work feed
        </Link>

        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Share your work</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-4)' }}>
            Post photos of a job you&apos;re proud of. It shows on the public work feed and your profile —
            every post is a customer magnet.
          </p>
        </div>

        <div className="card p-5 space-y-4">
          {/* Photos */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--color-text-3)' }}>
              Photos ({slots.length}/4) {beforeAfter && slots.length >= 2 && '· first = before, second = after'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.preview} alt="" className="w-full h-20 object-cover rounded-xl" style={{ border: '1px solid var(--color-border)' }} />
                  {beforeAfter && i < 2 && (
                    <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
                      {i === 0 ? 'BEFORE' : 'AFTER'}
                    </span>
                  )}
                  <button
                    onClick={() => setSlots((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {slots.length < 4 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="h-20 rounded-xl flex flex-col items-center justify-center gap-1"
                  style={{ border: '1.5px dashed var(--color-border)', background: 'var(--color-surface-2)' }}
                >
                  <ImagePlus className="w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
                  <span className="text-[9px]" style={{ color: 'var(--color-text-4)' }}>Add</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addFiles} />
          </div>

          {/* Video (best for reach) */}
          <div>
            <label className="text-xs font-semibold block mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-3)' }}>
              <Film className="w-3.5 h-3.5" style={{ color: '#818cf8' }} /> Video <span style={{ color: 'var(--color-text-4)' }}>· optional, gets the most reach</span>
            </label>
            {videoPreview ? (
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <video src={videoPreview} className="w-full max-h-56 object-contain bg-black" controls playsInline />
                <button
                  onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => videoRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl"
                style={{ border: '1.5px dashed var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text-3)' }}
              >
                <Video className="w-4 h-4" /> <span className="text-sm">Add a before/after video</span>
              </button>
            )}
            <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={addVideo} />
          </div>

          {/* Before/after toggle */}
          {slots.length >= 2 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-2)' }}>
              <input type="checkbox" checked={beforeAfter} onChange={(e) => setBeforeAfter(e.target.checked)} />
              This is a before / after transformation
            </label>
          )}

          {/* Caption */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--color-text-3)' }}>Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 500))}
              placeholder={'What did you fix? e.g. "Full water heater replacement in Katy — old unit was 15 years old and leaking. Done in 3 hours."'}
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Trade */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--color-text-3)' }}>Trade</label>
            <select value={trade} onChange={(e) => setTrade(e.target.value)} className="input">
              <option value="">My default trade</option>
              {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !hasContent}
            className="btn btn-primary btn-full"
            style={{ opacity: !hasContent ? 0.5 : 1 }}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {progress || 'Publishing…'}</>
            ) : (
              <><Send className="w-4 h-4" /> Publish to Work Feed</>
            )}
          </button>

          <p className="text-[11px] text-center flex items-center justify-center gap-1" style={{ color: 'var(--color-text-4)' }}>
            <Sparkles className="w-3 h-3" />
            Jobs completed through RepairAI get a &quot;Verified job&quot; badge automatically
          </p>
        </div>
      </div>
    </div>
  );
}
