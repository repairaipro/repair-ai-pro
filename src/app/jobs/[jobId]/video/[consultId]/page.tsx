'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import VideoConsultation from '@/components/VideoConsultation';

type ConsultStatus = 'requested' | 'scheduled' | 'active' | 'completed' | 'declined';

interface Consultation {
  id: string;
  contractorId: string;
  homeownerId: string;
  status: ConsultStatus;
  scheduledAt: string | null;
  proposedTimes: string[];
  notes: string;
}

export default function VideoCallPage() {
  const { jobId, consultId } = useParams<{ jobId: string; consultId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [consult, setConsult]   = useState<Consultation | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [jobDesc, setJobDesc]   = useState('');
  const [remoteName, setRemoteName] = useState('Other participant');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();

        // Fetch consultations for this job
        const res = await fetch(`/api/jobs/${jobId}/video-consultation`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Could not load consultation');
        const data = await res.json();

        const found = (data.consultations as Consultation[]).find((c) => c.id === consultId);
        if (!found) throw new Error('Consultation not found');
        setConsult(found);

        // Fetch job info for context
        const { db } = await import('@/lib/db');
        const { doc, getDoc } = await import('firebase/firestore');
        const jobSnap = await getDoc(doc(db, 'jobs', jobId));
        if (jobSnap.exists()) {
          const jobData = jobSnap.data();
          setJobDesc(jobData.description?.slice(0, 80) ?? '');

          // Figure out remote party name
          const isHomeowner = jobData.userId === user.uid;
          if (isHomeowner) {
            // Try to get contractor name from bids
            const bidsSnap = await fetch(`/api/jobs/${jobId}/bids`, { headers: { Authorization: `Bearer ${token}` } });
            if (bidsSnap.ok) {
              const bidsData = await bidsSnap.json();
              const bid = (bidsData.bids ?? []).find((b: any) => b.contractorId === found.contractorId);
              if (bid?.name) setRemoteName(bid.name);
              else setRemoteName('Contractor');
            }
          } else {
            setRemoteName('Homeowner');
          }
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to load call');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, jobId, consultId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>Loading call…</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !consult) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#fca5a5', fontWeight: 600, marginBottom: 8 }}>{error || 'Consultation not found'}</p>
          <Link href={`/jobs/${jobId}`} style={{ color: '#818cf8', fontSize: 14 }}>← Back to job</Link>
        </div>
      </div>
    );
  }

  /* Not yet scheduled */
  if (consult.status === 'requested') {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Clock size={40} color="#f59e0b" style={{ marginBottom: 16 }} />
        <h2 style={{ color: '#fcd34d', marginBottom: 8 }}>Awaiting Homeowner Approval</h2>
        <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', maxWidth: 360, marginBottom: 24 }}>
          The homeowner hasn't approved this consultation yet. You'll receive a notification when they confirm a time.
        </p>
        <Link href={`/jobs/${jobId}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#818cf8', fontSize: 14 }}>
          <ChevronLeft size={16} /> Back to job
        </Link>
      </div>
    );
  }

  /* Declined */
  if (consult.status === 'declined') {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AlertTriangle size={40} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ color: '#fca5a5', marginBottom: 8 }}>Consultation Declined</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>The homeowner declined this consultation request.</p>
        <Link href={`/jobs/${jobId}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#818cf8', fontSize: 14 }}>
          <ChevronLeft size={16} /> Back to job
        </Link>
      </div>
    );
  }

  /* Completed */
  if (consult.status === 'completed') {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#34d399', marginBottom: 8 }}>Consultation Complete</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>This pre-bid consultation has ended.</p>
        <Link href={`/jobs/${jobId}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#818cf8', fontSize: 14 }}>
          <ChevronLeft size={16} /> Back to job
        </Link>
      </div>
    );
  }

  /* Scheduled — show countdown or join button */
  const scheduledDate = consult.scheduledAt ? new Date(consult.scheduledAt) : null;
  const minsUntil = scheduledDate
    ? Math.round((scheduledDate.getTime() - Date.now()) / 60000)
    : null;
  const tooEarly = minsUntil !== null && minsUntil > 10;

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href={`/jobs/${jobId}`} style={{ color: '#6b7280', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f9fafb' }}>Pre-Bid Consultation</p>
          {jobDesc && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#4b5563' }}>{jobDesc}…</p>}
        </div>
        {scheduledDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
            <Calendar size={13} />
            {scheduledDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {tooEarly ? (
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <Clock size={44} color="#f59e0b" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ color: '#fcd34d', marginBottom: 8 }}>Call starts in {minsUntil} min</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 6 }}>
              Scheduled for {scheduledDate?.toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
            <p style={{ color: '#4b5563', fontSize: 12 }}>Come back when it's time — the Join button will appear 10 minutes before.</p>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 700 }}>
            <VideoConsultation
              jobId={jobId}
              consultId={consultId}
              remoteName={remoteName}
              onCallEnded={() => router.push(`/jobs/${jobId}`)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
