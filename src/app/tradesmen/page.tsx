'use client';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/lib/db';
import Link from 'next/link';

type Job = {
  id: string;
  description: string;
  status: string;
  createdAt: number;
  userId: string;
  mediaUrls?: string[];
  trade?: string;
  location?: string;
};

export default function TradesmanConsole() {
  const { user } = useAuth();
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);

  useEffect(() => {
    const qOpen = query(
      collection(db, 'jobs'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    const unsubOpen = onSnapshot(qOpen, (snap) => {
      const rows: Job[] = [];
      snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as any) }));
      setOpenJobs(rows);
    });

    let unsubMine = () => {};
    if (user) {
      const qMine = query(
        collection(db, 'jobs'),
        where('claimedBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubMine = onSnapshot(qMine, (snap) => {
        const rows: Job[] = [];
        snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as any) }));
        setMyJobs(rows);
      });
    }

    return () => {
      unsubOpen();
      unsubMine();
    };
  }, [user]);

  if (!user) return <div className="card">Please sign in as a tradesman to claim jobs.</div>;

  async function claim(id: string) {
    await updateDoc(doc(db, 'jobs', id), { status: 'claimed', claimedBy: user.uid });
  }

  async function unclaim(id: string) {
    await updateDoc(doc(db, 'jobs', id), { status: 'open', claimedBy: deleteField() });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tradesman Console</h1>

      {/* Open Jobs */}
      <section className="space-y-3">
        <h2 className="font-semibold">Open Jobs</h2>
        {!openJobs.length && <p className="text-sm text-gray-500">No open jobs.</p>}
        <div className="grid gap-3">
          {openJobs.map((j) => (
            <div key={j.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{new Date(j.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-semibold">
                    {j.trade?.toUpperCase() || 'GENERAL'} • {j.location || 'Unknown'}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => claim(j.id)}>
                  Claim
                </button>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{j.description}</p>

              {j.mediaUrls?.length ? (
                <div className="mt-2 text-xs">
                  {j.mediaUrls.map((u, i) => (
                    <div key={i} className="break-all">
                      <a href={u} target="_blank" rel="noreferrer" className="underline">
                        Media {i + 1}
                      </a>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* My Claimed Jobs */}
      <section className="space-y-3">
        <h2 className="font-semibold">My Claimed Jobs</h2>
        {!myJobs.length && <p className="text-sm text-gray-500">No claimed jobs.</p>}
        <div className="grid gap-3">
          {myJobs.map((j) => (
            <div key={j.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{new Date(j.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-semibold">
                    {j.trade?.toUpperCase() || 'GENERAL'} • {j.location || 'Unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 border rounded">{j.status}</span>
                  <button className="btn" onClick={() => unclaim(j.id)}>
                    Release
                  </button>
                </div>
              </div>

              <p className="mt-2 text-sm whitespace-pre-wrap">{j.description}</p>

              {/* 💬 Open Chat for Claimed Job */}
              <div className="mt-3 flex justify-end">
                <Link href={`/chat/${j.id}`} className="btn btn-sm btn-primary">
                  💬 Open Chat
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
