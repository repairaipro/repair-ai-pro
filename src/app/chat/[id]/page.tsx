'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/db';
import Link from 'next/link';

type Msg = {
  id: string;
  text: string;
  senderId: string;
  createdAt?: any;
  mediaUrls?: string[];
};

export default function MessengerChat() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load job info
  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'jobs', String(id))).then((snap) => {
      if (snap.exists()) setJob(snap.data());
    });
  }, [id]);

  // Subscribe to messages
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'jobs', String(id), 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Msg[] = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...(d.data() as any) }));
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    });
    return () => unsub();
  }, [id]);

  // Send or Edit
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;

    if (editId) {
      await updateDoc(doc(db, 'jobs', String(id), 'messages', editId), {
        text: text.trim(),
      });
      setEditId(null);
      setText('');
      return;
    }

    await addDoc(collection(db, 'jobs', String(id), 'messages'), {
      text: text.trim(),
      senderId: user.uid,
      createdAt: serverTimestamp(),
      mediaUrls: [],
    });
    setText('');
  }

  // Delete message
  async function handleDelete(mid: string) {
    await deleteDoc(doc(db, 'jobs', String(id), 'messages', mid));
  }

  if (!user) return <div className="card">Please sign in to chat.</div>;

  return (
    <div className="flex h-[90vh]">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 p-4 overflow-y-auto bg-white">
        <h2 className="font-semibold text-lg mb-3">Jobs</h2>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm underline mb-4 text-indigo-600"
        >
          Back to Dashboard
        </button>

        {/* Placeholder for job list later */}
        <p className="text-gray-500 text-sm">Your job threads will appear here.</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b px-4 py-2 flex justify-between items-center bg-gray-50">
          <div>
            <h1 className="font-semibold text-lg">{job?.trade?.toUpperCase() || 'Job Chat'}</h1>
            <p className="text-xs text-gray-500">{job?.location}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100">
          {messages.map((m) => {
            const mine = m.senderId === user.uid;
            const ts = m.createdAt?.toDate
              ? m.createdAt.toDate()
              : new Date(m.createdAt || Date.now());
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`relative px-3 py-2 rounded-2xl max-w-[75%] shadow ${
                    mine ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                  <small
                    className={`text-[10px] mt-1 block ${
                      mine ? 'text-indigo-200' : 'text-gray-500'
                    }`}
                  >
                    {ts.toLocaleString()}
                  </small>

                  {mine && (
                    <div className="absolute -top-2 -right-2 flex gap-1">
                      <button
                        onClick={() => {
                          setEditId(m.id);
                          setText(m.text);
                        }}
                        className="text-xs bg-yellow-400 text-black px-1 rounded"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-xs bg-red-500 text-white px-1 rounded"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="p-3 border-t flex gap-2 bg-white">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border rounded-full px-3 py-2 text-sm"
            placeholder={editId ? 'Edit message…' : 'Type a message…'}
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm"
          >
            {editId ? 'Save' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
