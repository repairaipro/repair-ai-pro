'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function ChatAttachmentsBar({ jobId }: { jobId: string }) {
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    if (!jobId) return;

    const q = query(
      collection(db, 'jobs', jobId, 'attachments'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setAttachments(list);
    });

    return () => unsub();
  }, [jobId]);

  if (!attachments.length) return null;

  return (
    <div className="border-b border-gray-800 bg-gray-900 px-4 py-2 flex gap-3 overflow-x-auto">
      {attachments.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          className="text-xs bg-gray-800 px-3 py-2 rounded border border-gray-700 text-gray-100 hover:border-indigo-500 whitespace-nowrap"
        >
          📎 {a.name || 'file'}
        </a>
      ))}
    </div>
  );
}
