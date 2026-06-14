'use client';

import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ContractorLiveMap } from '@/components/ContractorLiveMap';
import {
  collection, doc, getDoc, onSnapshot,
  orderBy, query, serverTimestamp, addDoc,
  updateDoc, deleteDoc, writeBatch, arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/db';
import {
  Send, ArrowLeft, Paperclip, X, CheckCheck,
  Clock, Briefcase, MapPin, DollarSign, Pencil, Trash2,
  Loader2, ImageIcon,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────── */
type Msg = {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  mediaUrls?: string[];
  edited?: boolean;
  readBy?: string[];
};

type Job = {
  id: string;
  description: string;
  trade?: string;
  status?: string;
  location?: any;
  paymentAmountUsd?: number;
  userId?: string;
  claimedBy?: string;
  contractorName?: string;
};

type Participant = {
  uid: string;
  name: string;
  photo?: string;
  role: 'homeowner' | 'contractor';
};

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatTime(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diff < 604800) return d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isSameDay(a: any, b: any): boolean {
  try {
    const da = (a?.toDate ? a.toDate() : new Date(a)).toDateString();
    const db_ = (b?.toDate ? b.toDate() : new Date(b)).toDateString();
    return da === db_;
  } catch { return false; }
}

function dayLabel(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000 / 86400;
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getCity(loc: any): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return loc.city ?? loc.address ?? '';
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Posted',        color: '#818cf8' },
  accepted:     { label: 'Accepted',      color: '#818cf8' },
  in_progress:  { label: 'In Progress',   color: '#34d399' },
  completed:    { label: 'Done — confirm',color: '#fb923c' },
  confirmed:    { label: 'Paid ✓',        color: '#22c55e' },
  cancelled:    { label: 'Cancelled',     color: '#f87171' },
};

/* ─── Avatar ─────────────────────────────────────────────────────── */
function Avatar({
  name, photo, size = 36,
}: { name: string; photo?: string; size?: number }) {
  if (photo) {
    return (
      <div
        className="flex-shrink-0 rounded-full overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Image src={photo} alt={name} width={size} height={size} className="object-cover" />
      </div>
    );
  }
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold"
      style={{
        width: size, height: size, fontSize: size * 0.35,
        background: 'linear-gradient(135deg, var(--color-brand), #8b5cf6)',
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function JobChat() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [text, setText] = useState('');

  /* Seed message input from ?prefill= (e.g. bid-pack deep links) */
  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get('prefill');
    if (prefill) setText(prefill);
  }, []);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  /* Load job */
  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'jobs', id)).then((snap) => {
      if (snap.exists()) setJob({ id: snap.id, ...(snap.data() as any) });
    });
  }, [id]);

  /* Load participant info */
  useEffect(() => {
    if (!job || !user) return;
    const ids: { uid: string; role: 'homeowner' | 'contractor' }[] = [];
    if (job.userId)    ids.push({ uid: job.userId,    role: 'homeowner'  });
    if (job.claimedBy) ids.push({ uid: job.claimedBy, role: 'contractor' });

    Promise.all(
      ids.map(async ({ uid, role }) => {
        // Try homeowners then contractors collection
        let name = 'User';
        let photo: string | undefined;
        try {
          const hw = await getDoc(doc(db, 'homeowners', uid));
          if (hw.exists()) {
            const d = hw.data();
            name  = d.name ?? d.displayName ?? name;
            photo = d.photoURL ?? d.photo ?? undefined;
          } else {
            const cw = await getDoc(doc(db, 'contractors', uid));
            if (cw.exists()) {
              const d = cw.data();
              name  = d.name ?? d.displayName ?? name;
              photo = d.photoURL ?? d.photo ?? undefined;
            }
          }
        } catch { /* non-fatal */ }
        return { uid, name, photo, role } as Participant;
      })
    ).then(setParticipants);
  }, [job, user]);

  /* Mark messages from the other user as read by me */
  async function markMessagesRead(msgs: Msg[], myUid: string) {
    const unread = msgs.filter(
      (m) => m.senderId !== myUid && !(m.readBy ?? []).includes(myUid)
    );
    if (!unread.length) return;
    const batch = writeBatch(db);
    for (const m of unread) {
      batch.update(doc(db, 'jobs', id!, 'messages', m.id), {
        readBy: arrayUnion(myUid),
      });
    }
    await batch.commit().catch(() => {});
  }

  /* Subscribe to messages */
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'jobs', id, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Msg[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => unsub();
  }, [id]);

  /* Mark incoming messages as read whenever messages or user changes */
  useEffect(() => {
    if (user && messages.length) {
      markMessagesRead(messages, user.uid);
    }
  }, [messages, user?.uid]);

  /* Auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /* Auto-resize textarea */
  useEffect(() => {
    const ta = textRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  /* Get participant by uid */
  const getParticipant = useCallback(
    (uid: string) => participants.find((p) => p.uid === uid),
    [participants],
  );

  /* Upload image to Cloudinary */
  async function uploadImage(file: File): Promise<string | null> {
    try {
      const sigRes = await fetch('/api/cloudinary/sign');
      const { signature, timestamp, apiKey, cloudName } = await sigRes.json();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', apiKey);
      fd.append('timestamp', timestamp);
      fd.append('signature', signature);
      fd.append('folder', `job-chat/${id}`);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST', body: fd,
      });
      const data = await r.json();
      return data.secure_url ?? null;
    } catch { return null; }
  }

  /* Send message */
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !imageFile) return;
    if (!user || !id) return;
    setSending(true);

    try {
      // Editing existing message
      if (editId) {
        await updateDoc(doc(db, 'jobs', id, 'messages', editId), {
          text: trimmed,
          edited: true,
        });
        setEditId(null);
        setText('');
        setSending(false);
        return;
      }

      // Upload image first if present
      let mediaUrls: string[] = [];
      if (imageFile) {
        setUploading(true);
        const url = await uploadImage(imageFile);
        if (url) mediaUrls = [url];
        setUploading(false);
      }

      await addDoc(collection(db, 'jobs', id, 'messages'), {
        text: trimmed,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        ...(mediaUrls.length ? { mediaUrls } : {}),
      });

      setText('');
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setSending(false);
    }
  }

  /* Delete message */
  async function handleDelete(mid: string) {
    if (!id) return;
    await deleteDoc(doc(db, 'jobs', id, 'messages', mid));
  }

  /* File picker */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  /* Keyboard: Enter to send, Shift+Enter for newline */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* Access check */
  const isParticipant = job && user && (job.userId === user.uid || job.claimedBy === user.uid);
  const otherParticipant = user ? participants.find((p) => p.uid !== user.uid) : null;
  const myParticipant = user ? participants.find((p) => p.uid === user.uid) : null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-3)' }}>Please sign in to view this chat.</p>
      </div>
    );
  }

  const statusInfo = STATUS_LABEL[job?.status ?? ''] ?? { label: job?.status ?? '', color: 'var(--color-text-4)' };

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        background: 'radial-gradient(1200px 600px at 50% -10%, rgba(99,102,241,0.06), transparent 60%), var(--color-bg)',
        maxWidth: 720,
        margin: '0 auto',
        borderLeft: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 sticky top-0 z-20"
        style={{
          background: 'rgba(15,16,22,0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Top row: back + participant */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: 'var(--color-text-2)' }}
            aria-label="Back"
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {otherParticipant && (
            <Link href={otherParticipant.role === 'contractor' ? `/contractor/${otherParticipant.uid}` : '#'} className="relative flex-shrink-0">
              <Avatar name={otherParticipant.name} photo={otherParticipant.photo} size={40} />
              {/* presence dot */}
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                style={{ background: '#22c55e', border: '2.5px solid rgba(15,16,22,0.95)' }}
              />
            </Link>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] truncate leading-tight" style={{ color: 'var(--color-text)' }}>
              {otherParticipant?.name ?? 'Loading…'}
            </p>
            <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--color-text-4)' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
              {otherParticipant?.role === 'contractor' ? 'Contractor · Active now' : 'Homeowner · Active now'}
            </p>
          </div>

          {job && (
            <Link
              href={`/jobs/${job.id}`}
              className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0 transition-colors"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}
            >
              View Job
            </Link>
          )}
        </div>

        {/* Job context bar */}
        {job && (
          <div
            className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center gap-3 flex-wrap"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" style={{ color: 'var(--color-brand)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-2)' }}>
                {job.trade ?? 'General'}
              </span>
            </div>
            {getCity(job.location) && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" style={{ color: 'var(--color-text-4)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                  {getCity(job.location)}
                </span>
              </div>
            )}
            {job.paymentAmountUsd && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" style={{ color: 'var(--color-text-4)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                  ${job.paymentAmountUsd}
                </span>
              </div>
            )}
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: `${statusInfo.color}18`,
                color: statusInfo.color,
              }}
            >
              {statusInfo.label}
            </span>
          </div>
        )}

        {/* Live location tracker (when contractor is heading to job) */}
        {job && job.status === 'accepted' && job.claimedBy && (
          <div className="mx-4 mb-3">
            <ContractorLiveMap
              jobId={job.id}
              destinationLat={job.location?.latitude}
              destinationLng={job.location?.longitude}
              contractorName={job.contractorName}
            />
          </div>
        )}
      </div>

      {/* Bubble entry animation */}
      <style>{`@keyframes chatPop{from{opacity:0;transform:translateY(6px) scale(0.98)}to{opacity:1;transform:none}}`}</style>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ gap: 4 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <Send className="w-7 h-7" style={{ color: 'var(--color-text-4)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-3)' }}>
              No messages yet
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--color-text-4)' }}>
              Send the first message to get the conversation started.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine = msg.senderId === user?.uid;
          const sender = getParticipant(msg.senderId);
          const prevMsg = messages[i - 1];
          const showDay = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
          const prevSame = prevMsg && prevMsg.senderId === msg.senderId && !showDay;

          return (
            <React.Fragment key={msg.id}>
              {/* Day divider */}
              {showDay && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                  <span className="text-xs px-2" style={{ color: 'var(--color-text-4)' }}>
                    {dayLabel(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                </div>
              )}

              <div
                className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ marginBottom: prevSame ? 2 : 12 }}
              >
                {/* Avatar (only for first in a run) */}
                <div style={{ width: 32, flexShrink: 0 }}>
                  {!prevSame && sender && (
                    <Avatar name={sender.name} photo={sender.photo} size={32} />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                  style={{ maxWidth: '72%' }}
                >
                  {/* Sender name (first in run only) */}
                  {!prevSame && !mine && sender && (
                    <p className="text-xs font-semibold mb-1 px-1" style={{ color: 'var(--color-text-3)' }}>
                      {sender.name}
                    </p>
                  )}

                  {/* Image attachment */}
                  {msg.mediaUrls?.map((url) => (
                    <div key={url} className="mb-1 rounded-xl overflow-hidden" style={{ maxWidth: 220 }}>
                      <Image
                        src={url}
                        alt="attachment"
                        width={220}
                        height={160}
                        className="object-cover cursor-pointer"
                        onClick={() => window.open(url, '_blank')}
                      />
                    </div>
                  ))}

                  {/* Text bubble */}
                  {msg.text && (
                    <div
                      className="group relative px-3.5 py-2.5"
                      style={
                        mine
                          ? {
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: '#fff',
                              borderRadius: 20,
                              borderBottomRightRadius: 6,
                              boxShadow: '0 4px 16px -4px rgba(99,102,241,0.5)',
                              animation: 'chatPop 0.22s cubic-bezier(0.22,1,0.36,1)',
                            }
                          : {
                              background: 'var(--color-surface)',
                              color: 'var(--color-text)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 20,
                              borderBottomLeftRadius: 6,
                              boxShadow: '0 2px 10px -4px rgba(0,0,0,0.4)',
                              animation: 'chatPop 0.22s cubic-bezier(0.22,1,0.36,1)',
                            }
                      }
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                      {/* Edit/delete on hover */}
                      {mine && (
                        <div
                          className="absolute -top-7 right-0 hidden group-hover:flex gap-1 rounded-lg px-1.5 py-1"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                        >
                          <button
                            onClick={() => { setEditId(msg.id); setText(msg.text); textRef.current?.focus(); }}
                            className="p-1 rounded hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--color-text-3)' }}
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="p-1 rounded hover:opacity-70 transition-opacity"
                            style={{ color: '#f87171' }}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamp + read receipt */}
                  <div className="flex items-center gap-1 mt-0.5 px-1">
                    <span className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                      {formatTime(msg.createdAt)}
                      {msg.edited && ' · edited'}
                    </span>
                    {mine && (() => {
                      const otherUid = otherParticipant?.uid;
                      const isRead = otherUid && (msg.readBy ?? []).includes(otherUid);
                      return (
                        <span aria-label={isRead ? 'Read' : 'Sent'}>
                          <CheckCheck
                            className="w-3 h-3"
                            style={{ color: isRead ? 'var(--color-brand)' : 'var(--color-text-4)' }}
                          />
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        {/* Edit mode banner */}
        {editId && (
          <div
            className="flex items-center justify-between mb-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-brand)' }}
          >
            <span>Editing message</span>
            <button
              onClick={() => { setEditId(null); setText(''); }}
              className="hover:opacity-70"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div className="relative mb-2 inline-block">
            <Image
              src={imagePreview}
              alt="preview"
              width={80}
              height={60}
              className="rounded-lg object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              </div>
            )}
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <X className="w-3 h-3" style={{ color: 'var(--color-text-3)' }} />
            </button>
          </div>
        )}

        {!isParticipant && job ? (
          <p className="text-center text-sm py-2" style={{ color: 'var(--color-text-4)' }}>
            You are not a participant in this conversation.
          </p>
        ) : (
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Pill: attach + text together */}
            <div
              className="flex-1 rounded-[22px] pl-2 pr-3 py-1.5 flex items-end gap-1.5"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ color: 'var(--color-text-4)' }}
                title="Attach photo"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-4)')}
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <textarea
                ref={textRef}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={editId ? 'Edit your message…' : 'Message…'}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed py-2"
                style={{
                  color: 'var(--color-text)',
                  maxHeight: 120,
                  scrollbarWidth: 'none',
                }}
              />
            </div>

            {/* Send */}
            <button
              type="submit"
              disabled={(!text.trim() && !imageFile) || sending || uploading}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
              style={{
                background: (text.trim() || imageFile) && !sending ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--color-surface-2)',
                color: (text.trim() || imageFile) && !sending ? '#fff' : 'var(--color-text-4)',
                cursor: (!text.trim() && !imageFile) || sending ? 'not-allowed' : 'pointer',
                boxShadow: (text.trim() || imageFile) && !sending ? '0 4px 14px -2px rgba(99,102,241,0.55)' : 'none',
              }}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        )}

        <p className="text-center text-[10px] mt-2" style={{ color: 'var(--color-text-4)' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
