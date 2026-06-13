'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth';
import { TRADES } from '@/lib/constants';
import {
  Camera, X, Loader2, Send, ArrowLeft, AlertCircle, ImagePlus, Sparkles,
} from 'lucide-react';

type Slot = { file: File; preview: string };

export default function NewWorkPostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [slots, setSlots]         = useState<Slot[]>([]);
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

  async function handleSubmit() {
    if (!user || slots.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      // Upload photos to Firebase Storage
      const storage = getStorage();
      const urls: string[] = [];
      for (let i = 0; i < slots.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${slots.length}…`);
        const sRef = ref(storage, `posts/${user.uid}/${Date.now()}_${i}_${slots[i].file.name}`);
        const task = uploadBytesResumable(sRef, slots[i].file);
        const url = await new Promise<string>((resolve, reject) => {
          task.on('state_changed', () => {}, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
        });
        urls.push(url);
      }

      setProgress('Publishing…');
      const token = await user.getIdToken();
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caption: caption.trim(), trade, photos: urls, beforeAfter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to publish');

      router.push('/work');
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
            disabled={submitting || slots.length === 0}
            className="btn btn-primary btn-full"
            style={{ opacity: slots.length === 0 ? 0.5 : 1 }}
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
