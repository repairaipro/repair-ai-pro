// src/components/JobDetailsDrawer.tsx
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import Link from 'next/link';

type Job = {
  id: string;
  description: string;
  status: string;
  createdAt: any;
  trade?: string;
  location?: string;
  contact?: { name?: string; email?: string; phone?: string };

  // NEW AI FIELDS
  aiSummary?: string;
  aiDetectedTrade?: string;
  aiSeverity?: string;               // "low" | "medium" | "high"
  aiSuggestedParts?: string[];
};

type Attachment = {
  id: string;
  name?: string;
  type: string;
  url: string;
};

export default function JobDetailsDrawer({
  openJobId,
  onClose,
}: {
  openJobId: string | null;
  onClose: () => void;
}) {
  const [job, setJob] = useState<Job | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const open = Boolean(openJobId);
  const toDate = (v: any) => (v?.toDate ? v.toDate() : new Date(v));

  // Load job + attachments
  useEffect(() => {
    if (!openJobId) return;

    (async () => {
      const ref = doc(db, 'jobs', openJobId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return setJob(null);

      setJob({
        id: snap.id,
        ...(snap.data() as any),
      });
    })();

    const qAtt = query(
      collection(db, 'jobs', openJobId, 'attachments'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(qAtt, (snap) => {
      const list: Attachment[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setAttachments(list);
    });

    return () => unsub();
  }, [openJobId]);

  if (!openJobId) return null;

  // --------------------------
  // Badge for severity
  // --------------------------
  function severityBadge(level?: string) {
    if (!level) return null;

    const colors: any = {
      low: 'bg-green-700/20 text-green-300 border-green-600',
      medium: 'bg-yellow-700/20 text-yellow-300 border-yellow-600',
      high: 'bg-red-700/20 text-red-300 border-red-600',
    };

    return (
      <span className={`px-2 py-1 rounded-md text-[10px] uppercase border ${colors[level]}`}>
        {level} severity
      </span>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-gray-950 border-l border-gray-800 p-6 transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {!job ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <>
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-indigo-400">
                  {job.trade?.toUpperCase() || 'GENERAL'}
                </h2>
                <p className="text-gray-300 mt-1">{job.description}</p>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Basic Info */}
            <div className="mt-4 text-xs text-gray-400 space-y-2">
              <p>
                Status:{' '}
                <span className="text-gray-200 font-semibold">{job.status}</span>
              </p>

              {job.location && (
                <p>
                  Location:{' '}
                  <span className="text-gray-200">{job.location}</span>
                </p>
              )}

              <p>
                Created:{' '}
                <span className="text-gray-200">
                  {toDate(job.createdAt).toLocaleString()}
                </span>
              </p>

              <Link
                href={`/jobs/${job.id}`}
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-2 rounded-md mt-3"
              >
                💬 Open Chat
              </Link>
              <Link
                href={`/ai-assistant?job=${job.id}`}
                className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-2 rounded-md mt-2"
              >
                🤖 Ask Repair-AI
              </Link>
              
            </div>

            <hr className="my-4 border-gray-800" />

            {/* ⭐ NEW: AI INTELLIGENCE SECTION ⭐ */}
            {(job.aiSummary || job.aiDetectedTrade || job.aiSuggestedParts) && (
              <div className="mb-6 p-4 bg-gray-900 border border-indigo-600 rounded-lg">
                <h3 className="text-indigo-300 font-semibold mb-2">AI Insight</h3>

                {severityBadge(job.aiSeverity)}

                {job.aiDetectedTrade && (
                  <p className="text-sm mt-2">
                    <span className="text-gray-400">Suggested Trade:</span>{' '}
                    <span className="text-gray-200 font-semibold">
                      {job.aiDetectedTrade}
                    </span>
                  </p>
                )}

                {job.aiSummary && (
                  <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">
                    {job.aiSummary}
                  </p>
                )}

                {job.aiSuggestedParts && job.aiSuggestedParts.length > 0 && (
                  <div className="mt-3">
                    <p className="text-gray-400 text-xs mb-1">Suggested Parts:</p>
                    <ul className="list-disc list-inside text-gray-300 text-xs space-y-1">
                      {job.aiSuggestedParts.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            <h3 className="text-white font-semibold">Attachments</h3>

            {!attachments.length && (
              <p className="text-xs text-gray-500 mt-2">None</p>
            )}

            <div className="mt-2 space-y-3">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="bg-gray-900 p-3 border border-gray-800 rounded-md"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-100 font-medium">
                      {a.name || a.type}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase">
                      {a.type}
                    </span>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <a
                      href={a.url}
                      target="_blank"
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
