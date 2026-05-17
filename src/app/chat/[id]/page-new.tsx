'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/db';
import {
  Send,
  ArrowLeft,
  Paperclip,
  X,
  CheckCheck,
  Clock,
  Briefcase,
  MapPin,
  DollarSign,
  Pencil,
  Trash2,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLayout } from '@/components';

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

function formatTime(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isSameDay(a: any, b: any): boolean {
  try {
    const da = (a?.toDate ? a.toDate() : new Date(a)).toDateString();
    const db_ = (b?.toDate ? b.toDate() : new Date(b)).toDateString();
    return da === db_;
  } catch {
    return false;
  }
}

function dayLabel(ts: any): string {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000 / 86400;
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getCity(loc: any): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return loc.city ?? loc.address ?? '';
}

function Avatar({ name, photo, size = 36 }: { name: string; photo?: string; size?: number }) {
  if (photo) {
    return (
      <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size }}>
        <Image src={photo} alt={name} width={size} height={size} className="object-cover" />
      </div>
    );
  }
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: 'linear-gradient(135deg, var(--color-brand), #8b5cf6)',
      }}
    >
      {initials}
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Posted', color: '#818cf8' },
  accepted: { label: 'Accepted', color: '#818cf8' },
  in_progress: { label: 'In Progress', color: '#34d399' },
  completed: { label: 'Done — confirm', color: '#fb923c' },
  confirmed: { label: 'Paid ✓', color: '#22c55e' },
  cancelled: { label: 'Cancelled', color: '#f87171' },
};

export default function JobChat() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [text, setText] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'jobs', id)).then((snap) => {
      if (!snap.exists()) {
        router.push('/jobs');
        return;
      }
      setJob({ id: snap.id, ...(snap.data() as any) });
    });
  }, [id, router]);

  useEffect(() => {
    if (!id || !user) return;
    const q = query(collection(db, `jobs/${id}/messages`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [id, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getParticipant = (uid: string) => participants.find((p) => p.uid === uid);
  const statusInfo = job?.status ? STATUS_LABEL[job.status] : STATUS_LABEL.pending;

  const handleSend = async () => {
    if (!text.trim() || !id || !user || !job) return;
    setSending(true);
    try {
      const messageData = {
        text: text.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
      };

      if (editId) {
        await updateDoc(doc(db, `jobs/${id}/messages/${editId}`), {
          ...messageData,
          edited: true,
        });
        setEditId(null);
      } else {
        await addDoc(collection(db, `jobs/${id}/messages`), messageData);
      }

      setText('');
      textRef.current?.focus();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      className="h-screen flex flex-col"
      style={{ background: 'var(--color-bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <motion.div
        className="border-b flex items-center justify-between p-4 md:p-6"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Link href="/jobs" className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text)' }} />
          </Link>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {job?.contractorName || 'Contractor'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              {job?.trade || 'Service'} • {getCity(job?.location)}
            </p>
          </div>
        </div>

        {/* Job status badge */}
        {job && (
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: `${statusInfo.color}18`,
                color: statusInfo.color,
              }}
            >
              {statusInfo.label}
            </span>
          </div>
        )}
      </motion.div>

      {/* Job context card */}
      <motion.div
        className="mx-4 my-4 p-4 rounded-xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {job?.trade && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                Service
              </p>
              <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                {job.trade}
              </p>
            </div>
          )}
          {getCity(job?.location) && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                Location
              </p>
              <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                {getCity(job.location)}
              </p>
            </div>
          )}
          {job?.paymentAmountUsd && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                Amount
              </p>
              <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                ${job.paymentAmountUsd}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              Status
            </p>
            <p className="font-medium text-sm" style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <motion.div
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center h-full gap-3 py-16"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <Send className="w-8 h-8" style={{ color: 'var(--color-text-4)' }} />
              </div>
              <p className="text-sm font-medium text-center" style={{ color: 'var(--color-text-3)' }}>
                Start the conversation
              </p>
              <p className="text-xs text-center" style={{ color: 'var(--color-text-4)' }}>
                Send the first message to get things rolling
              </p>
            </motion.div>
          ) : (
            messages.map((msg, i) => {
              const mine = msg.senderId === user?.uid;
              const prevMsg = messages[i - 1];
              const showDay = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
              const prevSame = prevMsg && prevMsg.senderId === msg.senderId && !showDay;

              return (
                <React.Fragment key={msg.id}>
                  {/* Day divider */}
                  {showDay && (
                    <motion.div
                      className="flex items-center gap-3 my-4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                      <span className="text-xs px-2 whitespace-nowrap" style={{ color: 'var(--color-text-4)' }}>
                        {dayLabel(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                    </motion.div>
                  )}

                  {/* Message bubble */}
                  <motion.div
                    className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                    initial={{ opacity: 0, x: mine ? 20 : -20, y: 10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    style={{ marginBottom: prevSame ? 8 : 16 }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 32, flexShrink: 0 }}>
                      {!prevSame && <Avatar name="User" size={32} />}
                    </div>

                    {/* Message content */}
                    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`} style={{ maxWidth: '85%', minWidth: 0 }}>
                      {/* Bubble */}
                      {msg.text && (
                        <motion.div
                          className="px-4 py-2.5 rounded-2xl"
                          style={
                            mine
                              ? {
                                  background: 'var(--color-brand)',
                                  color: '#fff',
                                  borderBottomRightRadius: 8,
                                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)',
                                }
                              : {
                                  background: 'var(--color-surface)',
                                  color: 'var(--color-text)',
                                  border: '1px solid var(--color-border)',
                                  borderBottomLeftRadius: 8,
                                }
                          }
                          whileHover={{ scale: 1.02 }}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                        </motion.div>
                      )}

                      {/* Time + read receipt */}
                      <div className="flex items-center gap-1.5 mt-1.5 px-1">
                        <span className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {mine && (
                          <CheckCheck className="w-3 h-3" style={{ color: 'var(--color-text-4)' }} />
                        )}
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </motion.div>

      {/* Input area */}
      <motion.div
        className="border-t p-4 md:p-6"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex gap-3">
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="input resize-none flex-1"
            style={{ minHeight: 44, color: 'var(--color-text)', background: 'var(--color-bg)' }}
          />
          <motion.button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="btn btn-primary p-3 flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ width: 44, height: 44, padding: 0 }}
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-4)' }}>
          Press Shift + Enter for new line
        </p>
      </motion.div>
    </motion.div>
  );
}
