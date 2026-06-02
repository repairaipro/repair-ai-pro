'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { doc, onSnapshot, collection, query, orderBy, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import {
  ChevronLeft, MessageSquare, CheckCircle2, Clock, AlertTriangle,
  DollarSign, Star, Briefcase, FileText, Loader2, ChevronRight,
  User, Wrench, MapPin, Zap, TrendingUp, Shield, XCircle, X,
} from 'lucide-react';
import InsuranceReportModal from '@/components/InsuranceReportModal';
import { ReviewModal } from '@/components/ReviewModal';
import JobLocationTracker, { type JobLocation } from '@/components/JobLocationTracker';

/* ── Types ── */
type Job = {
  id:               string;
  description:      string;
  trade?:           string;
  aiDetectedTrade?: string;
  status:           string;
  claimedBy?:       string;
  userId?:          string;
  createdAt?:       any;
  updatedAt?:       any;
  location?:        any;
  paymentAmountUsd?: number;
  isEmergency?:     boolean;
  emergencyFeeUsd?: number;
  aiSummary?:       string;
  bidCount?:        number;
  insuranceReport?: { content: string; generatedAt: any };
  contractorLocation?: { lat: number; lng: number; timestamp: number; accuracy?: number; speed?: number; heading?: number };
  lastLocationUpdate?: any;
};

type Bid = {
  contractorId:   string;
  amount:         number;
  message:        string;
  etaDays?:       number;
  submittedAt?:   any;
  status:         'pending' | 'selected' | 'declined';
  // Merged contractor info
  name?:          string;
  avgRating?:     number;
  reviewCount?:   number;
  jobsCompleted?: number;
  subscriptionPlan?: string;
  photoUrl?:      string;
};

/* ── Status config ── */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; step: number }> = {
  triaged:              { label: 'Awaiting Bids',      color: '#fbbf24',              icon: <Clock size={16} />,        step: 1 },
  open:                 { label: 'Open for Bids',       color: '#fbbf24',              icon: <Clock size={16} />,        step: 1 },
  matched:              { label: 'Matched',             color: '#60a5fa',              icon: <Zap size={16} />,          step: 2 },
  accepted:             { label: 'Contractor Assigned', color: '#818cf8',              icon: <CheckCircle2 size={16} />, step: 2 },
  claimed:              { label: 'Contractor Assigned', color: '#818cf8',              icon: <CheckCircle2 size={16} />, step: 2 },
  in_progress:          { label: 'In Progress',         color: '#34d399',              icon: <Wrench size={16} />,       step: 3 },
  completed:            { label: 'Awaiting Confirmation', color: '#fb923c',            icon: <Clock size={16} />,        step: 4 },
  awaiting_confirmation:{ label: 'Awaiting Confirmation', color: '#fb923c',            icon: <Clock size={16} />,        step: 4 },
  confirmed:            { label: 'Confirmed ✓',         color: 'var(--color-success)', icon: <CheckCircle2 size={16} />, step: 5 },
  verified:             { label: 'Verified ✓',          color: 'var(--color-success)', icon: <CheckCircle2 size={16} />, step: 5 },
  disputed:             { label: 'Disputed',            color: 'var(--color-error)',   icon: <AlertTriangle size={16} />,step: 3 },
  cancelled:            { label: 'Cancelled',           color: '#6b7280',              icon: <AlertTriangle size={16} />,step: 0 },
};

const STEPS = ['Posted', 'Matched', 'In Progress', 'Complete', 'Confirmed'];

function timeAgo(ts: any) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

/* ── Progress stepper ── */
function ProgressStepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const idx    = i + 1;
        const done   = step > idx;
        const active = step === idx;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: done || active ? 'var(--color-brand)' : 'var(--color-surface-2)',
                  color:      done || active ? '#fff' : 'var(--color-text-4)',
                  boxShadow:  active ? '0 0 12px rgba(99,102,241,0.5)' : 'none',
                }}
              >
                {done ? <CheckCircle2 size={13} /> : idx}
              </div>
              <span className="text-[9px] font-medium mt-1 whitespace-nowrap"
                style={{ color: done || active ? 'var(--color-brand)' : 'var(--color-text-4)' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mb-4 mx-1"
                style={{ background: done ? 'var(--color-brand)' : 'var(--color-surface-2)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Bid card ── */
function BidCard({
  bid, isHomeowner, onSelect, selecting,
}: {
  bid: Bid;
  isHomeowner: boolean;
  onSelect: (id: string) => void;
  selecting: string | null;
}) {
  const isPro   = bid.subscriptionPlan === 'pro' || bid.subscriptionPlan === 'elite';
  const isElite = bid.subscriptionPlan === 'elite';
  const initials = (bid.name ?? '?')[0].toUpperCase();

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: bid.status === 'selected'
          ? 'rgba(34,197,94,0.07)' : 'var(--color-surface)',
        border: bid.status === 'selected'
          ? '1.5px solid rgba(34,197,94,0.35)'
          : '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link href={`/contractor/${bid.contractorId}`}>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
          >
            {initials}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/contractor/${bid.contractorId}`}
              className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {bid.name ?? 'Contractor'}
            </Link>
            {isElite && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>ELITE</span>
            )}
            {isPro && !isElite && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>PRO</span>
            )}
            {bid.status === 'selected' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }}>SELECTED</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-0.5">
            {bid.avgRating != null && (
              <span className="flex items-center gap-0.5 text-xs" style={{ color: '#fbbf24' }}>
                <Star size={10} fill="currentColor" /> {bid.avgRating.toFixed(1)}
                <span style={{ color: 'var(--color-text-4)' }}>({bid.reviewCount ?? 0})</span>
              </span>
            )}
            {bid.jobsCompleted != null && (
              <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                {bid.jobsCompleted} jobs
              </span>
            )}
            {bid.etaDays != null && (
              <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--color-text-4)' }}>
                <Clock size={10} /> {bid.etaDays}d ETA
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black" style={{ color: 'var(--color-success)' }}>${bid.amount}</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>total</p>
        </div>
      </div>

      {bid.message && (
        <p className="text-xs mt-3 leading-relaxed px-1"
          style={{ color: 'var(--color-text-3)', borderLeft: '2px solid var(--color-border)', paddingLeft: '8px' }}>
          "{bid.message}"
        </p>
      )}

      {/* Select button — homeowner only, pending bids only */}
      {isHomeowner && bid.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSelect(bid.contractorId)}
            disabled={selecting !== null}
            className="btn btn-primary btn-sm flex-1"
            style={{ justifyContent: 'center' }}
          >
            {selecting === bid.contractorId
              ? <><Loader2 size={13} className="animate-spin" /> Selecting…</>
              : <><CheckCircle2 size={13} /> Select This Contractor</>}
          </button>
          <Link href={`/contractor/${bid.contractorId}`} className="btn btn-secondary btn-sm">
            <User size={13} /> Profile
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function JobDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const { user } = useAuth();
  const jobId    = params?.jobId as string;

  const [job,              setJob]              = useState<Job | null>(null);
  const [bids,             setBids]             = useState<Bid[]>([]);
  const [jobLoading,       setJobLoading]       = useState(true);
  const [bidsLoading,      setBidsLoading]      = useState(true);
  const [confirming,       setConfirming]       = useState(false);
  const [confirmDone,      setConfirmDone]      = useState(false);
  const [confirmError,     setConfirmError]     = useState('');
  const [selectingBid,     setSelectingBid]     = useState<string | null>(null);
  const [showInsurance,    setShowInsurance]    = useState(false);
  const [showReview,       setShowReview]       = useState(false);
  const [authToken,        setAuthToken]        = useState('');
  const [progressing,      setProgressing]      = useState(false);
  const [progressError,    setProgressError]    = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason,     setCancelReason]     = useState('');
  const [cancelling,       setCancelling]       = useState(false);
  const [cancelError,      setCancelError]      = useState('');
  const [contractorLocationData, setContractorLocationData] = useState<JobLocation | null>(null);

  /* Live job */
  useEffect(() => {
    if (!jobId) return;
    const unsub = onSnapshot(doc(db, 'jobs', jobId), (snap) => {
      if (snap.exists()) {
        const jobData = { id: snap.id, ...(snap.data() as any) };
        setJob(jobData);
        // Update contractor location from job data
        if (jobData.contractorLocation) {
          setContractorLocationData(jobData.contractorLocation);
        }
      } else {
        setJob(null);
      }
      setJobLoading(false);
    }, () => setJobLoading(false));
    return unsub;
  }, [jobId]);

  /* Bids */
  useEffect(() => {
    if (!jobId || !user) return;
    user.getIdToken().then((token: string) =>
      fetch(`/api/jobs/${jobId}/bids`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d.bids)) setBids(d.bids); })
        .catch(() => {})
        .finally(() => setBidsLoading(false))
    );
  }, [jobId, user, job?.status]);

  async function handleConfirm() {
    if (!user) return;
    setConfirming(true);
    setConfirmError('');
    try {
      const token = await user.getIdToken();
      const res   = await fetch(`/api/jobs/${jobId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      if (data.success) {
        setConfirmDone(true);
        setAuthToken(token);
        // Show review modal if there's a contractor to review
        if (job?.claimedBy) {
          setTimeout(() => setShowReview(true), 800);
        }
      } else {
        setConfirmError(data.error ?? 'Could not confirm. Please try again.');
      }
    } catch {
      setConfirmError('Network error. Please try again.');
    }
    setConfirming(false);
  }

  async function handleSelectBid(contractorId: string) {
    if (!user) return;
    setSelectingBid(contractorId);
    try {
      const token = await user.getIdToken();
      const res   = await fetch(`/api/jobs/${jobId}/select-bid`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ contractorId }),
      });
      const data  = await res.json();
      if (!data.success) console.error(data.error);
    } catch { /* ignore */ }
    setSelectingBid(null);
  }

  async function handleProgress(nextStatus: string) {
    if (!user) return;
    setProgressing(true);
    setProgressError('');
    try {
      const token = await user.getIdToken();
      const res   = await fetch(`/api/jobs/${jobId}/progress`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ nextStatus }),
      });
      const data  = await res.json();
      if (!data.success) setProgressError(data.error ?? 'Could not update job status.');
    } catch {
      setProgressError('Network error. Please try again.');
    }
    setProgressing(false);
  }

  async function handleCancel() {
    if (!user) return;
    setCancelling(true);
    setCancelError('');
    try {
      const token = await user.getIdToken();
      const res   = await fetch(`/api/jobs/${jobId}/cancel`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ reason: cancelReason.trim() || 'No reason given' }),
      });
      const data  = await res.json();
      if (res.ok) {
        setShowCancelDialog(false);
        setCancelReason('');
      } else {
        setCancelError(data.error ?? 'Could not cancel. Please try again.');
      }
    } catch {
      setCancelError('Network error. Please try again.');
    }
    setCancelling(false);
  }

  async function handleLocationUpdate(location: JobLocation) {
    if (!jobId || !user) return;
    setContractorLocationData(location);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/jobs/${jobId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location }),
      });
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  }

  if (jobLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="h-6 w-24 rounded animate-pulse" style={{ background: 'var(--color-surface)' }} />
        <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)' }} />
        <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)' }} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Job not found</p>
        <Link href="/dashboard" className="btn btn-primary mt-4">Go to Dashboard</Link>
      </div>
    );
  }

  const cfg          = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.triaged;
  const isHomeowner  = job.userId === user?.uid;
  const isContractor = job.claimedBy === user?.uid;
  const needsConfirm = isHomeowner && (job.status === 'completed' || job.status === 'awaiting_confirmation');
  const hasBids      = bids.length > 0;
  const pendingBids  = bids.filter((b) => b.status === 'pending');
  const selectedBid  = bids.find((b) => b.status === 'selected');
  const trade        = job.aiDetectedTrade ?? job.trade ?? 'General';

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Back */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'var(--color-text-3)' }}>
            <ChevronLeft size={15} /> Dashboard
          </Link>
          <Link href={`/chat/${jobId}`}
            className="btn btn-sm btn-secondary">
            <MessageSquare size={13} /> Message
          </Link>
        </div>

        {/* ── Status card ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {/* Status badge */}
          <div className="flex items-center justify-between mb-4">
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}35` }}
            >
              {cfg.icon} {cfg.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              {timeAgo(job.createdAt)}
            </span>
          </div>

          {/* Description */}
          <h1 className="text-lg font-bold leading-snug mb-2"
            style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {job.description}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-brand-dim)', color: 'var(--color-brand)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Wrench size={10} /> {trade}
            </span>
            {job.isEmergency && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Zap size={10} /> Emergency
              </span>
            )}
            {job.paymentAmountUsd && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
                <DollarSign size={10} /> ${job.paymentAmountUsd} escrowed
              </span>
            )}
          </div>

          {/* Progress stepper */}
          <ProgressStepper step={cfg.step} />
        </div>

        {/* ── Confirm completion ── */}
        {needsConfirm && !confirmDone && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(249,115,22,0.07)', border: '1.5px solid rgba(249,115,22,0.3)' }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(249,115,22,0.15)' }}>
                <CheckCircle2 size={18} style={{ color: '#fb923c' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  Job marked complete — confirm to release payment
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-4)' }}>
                  Confirming releases payment to the contractor and closes the job. You can also leave a review.
                </p>
              </div>
            </div>
            {confirmError && (
              <p className="text-xs mb-3 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                {confirmError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="btn btn-primary flex-1"
                style={{ justifyContent: 'center' }}
              >
                {confirming
                  ? <><Loader2 size={15} className="animate-spin" /> Confirming…</>
                  : <><CheckCircle2 size={15} /> Confirm Complete & Pay</>}
              </button>
              <Link href={`/chat/${jobId}`} className="btn btn-secondary">
                <MessageSquare size={15} />
              </Link>
            </div>
          </div>
        )}

        {confirmDone && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.3)' }}
          >
            <CheckCircle2 size={28} style={{ color: 'var(--color-success)', margin: '0 auto 8px' }} />
            <p className="font-bold" style={{ color: 'var(--color-text)' }}>Payment released! 🎉</p>
            <p className="text-sm mt-1 mb-3" style={{ color: 'var(--color-text-4)' }}>
              Funds are on their way to the contractor.
            </p>
            {job.claimedBy && !showReview && (
              <button
                onClick={() => setShowReview(true)}
                className="btn btn-sm btn-primary"
              >
                <Star size={13} /> Leave a Review
              </button>
            )}
          </div>
        )}

        {/* ── Contractor progress actions ── */}
        {isContractor && ['accepted', 'in_progress'].includes(job.status) && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: job.status === 'accepted'
                ? 'rgba(129,140,248,0.07)' : 'rgba(52,211,153,0.07)',
              border: `1.5px solid ${job.status === 'accepted' ? 'rgba(129,140,248,0.3)' : 'rgba(52,211,153,0.3)'}`,
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: job.status === 'accepted'
                    ? 'rgba(129,140,248,0.15)' : 'rgba(52,211,153,0.15)',
                }}
              >
                {job.status === 'accepted'
                  ? <Zap size={18} style={{ color: '#818cf8' }} />
                  : <CheckCircle2 size={18} style={{ color: '#34d399' }} />}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {job.status === 'accepted' ? 'Ready to start?' : 'Job in progress'}
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-4)' }}>
                  {job.status === 'accepted'
                    ? 'Tap below when you arrive and begin work.'
                    : 'Mark the job complete when all work is done. The homeowner will confirm and payment will be released.'}
                </p>
              </div>
            </div>
            {progressError && (
              <p className="text-xs mb-3 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                {progressError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleProgress(job.status === 'accepted' ? 'in_progress' : 'completed')}
                disabled={progressing}
                className="btn btn-primary flex-1"
                style={{ justifyContent: 'center' }}
              >
                {progressing
                  ? <><Loader2 size={15} className="animate-spin" /> Updating…</>
                  : job.status === 'accepted'
                    ? <><Zap size={15} /> Start Job</>
                    : <><CheckCircle2 size={15} /> Mark Complete</>}
              </button>
              <Link href={`/chat/${jobId}`} className="btn btn-secondary">
                <MessageSquare size={15} />
              </Link>
            </div>
          </div>
        )}

        {/* ── Location Tracking ── */}
        {['accepted', 'in_progress'].includes(job.status) && job.claimedBy && (
          <JobLocationTracker
            jobId={jobId}
            isContractor={isContractor}
            isActive={true}
            customerAddress={typeof job.location === 'object' ? job.location?.address : undefined}
            contractorName={selectedBid?.name || bids.find(b => b.contractorId === job.claimedBy)?.name}
            contractorLocation={contractorLocationData || undefined}
            customerLocation={typeof job.location === 'object' && job.location?.coordinates
              ? { lat: job.location.coordinates.lat, lng: job.location.coordinates.lng }
              : undefined}
            onLocationUpdate={handleLocationUpdate}
          />
        )}

        {/* ── Bids section ── */}
        {(hasBids || (isHomeowner && ['triaged', 'open'].includes(job.status))) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
                {selectedBid ? 'Winning Bid' : `Contractor Bids (${bids.length})`}
              </h2>
              {pendingBids.length > 0 && isHomeowner && (
                <span className="text-xs" style={{ color: 'var(--color-brand)' }}>
                  Pick the best offer
                </span>
              )}
            </div>

            {bidsLoading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)' }} />
                ))}
              </div>
            ) : hasBids ? (
              <div className="space-y-3">
                {/* Selected bid first */}
                {selectedBid && (
                  <BidCard bid={selectedBid} isHomeowner={isHomeowner}
                    onSelect={handleSelectBid} selecting={selectingBid} />
                )}
                {/* Pending bids */}
                {pendingBids.map((bid) => (
                  <BidCard key={bid.contractorId} bid={bid} isHomeowner={isHomeowner}
                    onSelect={handleSelectBid} selecting={selectingBid} />
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: 'var(--color-surface)', border: '2px dashed var(--color-border)' }}
              >
                <TrendingUp size={24} style={{ color: 'var(--color-text-4)', margin: '0 auto 8px' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Waiting for bids
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                  Contractors are reviewing your job. You'll be notified when bids come in.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── AI Summary ── */}
        {job.aiSummary && (
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#818cf8' }}>AI Analysis</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-3)' }}>{job.aiSummary}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/chat/${jobId}`} className="btn btn-secondary btn-full" style={{ justifyContent: 'center' }}>
            <MessageSquare size={15} /> Message
          </Link>
          {isHomeowner && (
            <button
              onClick={() => setShowInsurance(true)}
              className="btn btn-secondary btn-full"
              style={{ justifyContent: 'center' }}
            >
              <FileText size={15} /> Insurance Report
            </button>
          )}
          {job.claimedBy && isHomeowner && (
            <Link href={`/contractor/${job.claimedBy}`} className="btn btn-secondary btn-full" style={{ justifyContent: 'center' }}>
              <User size={15} /> Contractor Profile
            </Link>
          )}
          {(job.status === 'confirmed' || job.status === 'verified') && job.claimedBy && isHomeowner && (
            <button
              onClick={() => setShowReview(true)}
              className="btn btn-secondary btn-full"
              style={{ justifyContent: 'center' }}
            >
              <Star size={15} /> Leave Review
            </button>
          )}
          {/* Cancel — homeowner only on triaged or accepted */}
          {isHomeowner && ['triaged', 'accepted'].includes(job.status) && (
            <button
              onClick={() => { setShowCancelDialog(true); setCancelError(''); }}
              className="btn btn-full"
              style={{
                justifyContent: 'center',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'var(--color-error)',
              }}
            >
              <XCircle size={15} /> Cancel Job
            </button>
          )}
        </div>

        {/* ── Security note ── */}
        <div className="flex items-center gap-2 justify-center">
          <Shield size={12} style={{ color: 'var(--color-text-4)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            Payment secured in escrow · Released only when you confirm
          </p>
        </div>

      </div>

      {/* Insurance Report Modal */}
      {showInsurance && (
        <InsuranceReportModal
          jobId={jobId}
          jobDescription={job.description}
          isOpen={showInsurance}
          onClose={() => setShowInsurance(false)}
        />
      )}

      {/* ── Cancel Job Dialog ── */}
      {showCancelDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCancelDialog(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)' }}
                >
                  <XCircle size={18} style={{ color: 'var(--color-error)' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Cancel this job?</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
                    {job.paymentAmountUsd
                      ? 'Your payment will be fully refunded.'
                      : 'This action cannot be undone.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-4)' }}
              >
                <X size={13} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-3)' }}>
                Reason (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Found another contractor, no longer needed…"
                rows={3}
                maxLength={500}
                className="input resize-none text-sm w-full"
              />
            </div>

            {cancelError && (
              <p className="text-xs px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)' }}>
                {cancelError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn flex-1"
                style={{
                  justifyContent: 'center',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1.5px solid rgba(239,68,68,0.35)',
                  color: 'var(--color-error)',
                }}
              >
                {cancelling
                  ? <><Loader2 size={14} className="animate-spin" /> Cancelling…</>
                  : <><XCircle size={14} /> Confirm Cancel</>}
              </button>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="btn btn-secondary flex-1"
                style={{ justifyContent: 'center' }}
              >
                Keep Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal — fires automatically after confirmation */}
      {showReview && job?.claimedBy && user && (
        <ReviewModal
          jobId={jobId}
          contractorId={job.claimedBy}
          reviewerId={user.uid}
          token={authToken}
          onClose={() => setShowReview(false)}
          onSubmitted={() => {
            // Keep modal open in "done" state — it handles its own close
          }}
        />
      )}
    </div>
  );
}
