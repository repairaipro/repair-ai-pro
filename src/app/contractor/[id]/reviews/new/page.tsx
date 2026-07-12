'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, ChevronLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

const RATING_LABEL: Record<number, string> = {
  5: "Excellent",
  4: "Good",
  3: "Average",
  2: "Poor",
  1: "Terrible",
};

export default function NewReviewPage({ params }: { params: { id: string } }) {
  const contractorId = params.id;
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const jobId = searchParams.get("job");

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  /* ---------------- SECURITY CHECK ---------------- */
  useEffect(() => {
    async function verifyEligibility() {
      if (!user || !jobId) return;

      // Prevent duplicate review for same job
      const q = query(
        collection(db, "contractors", contractorId, "reviews"),
        where("jobId", "==", jobId),
        where("reviewerId", "==", user.uid)
      );

      try {
        const snap = await getDocs(q);
        if (!snap.empty) {
          setError("You've already reviewed this job.");
          setTimeout(() => router.replace(`/contractor/${contractorId}`), 1500);
          return;
        }
      } catch {
        /* fall through — submit will re-guard via rules */
      }
      setChecking(false);
    }

    verifyEligibility();
  }, [user, jobId, contractorId, router]);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="text-center max-w-sm" style={{ color: 'var(--color-text-3)' }}>{children}</div>
    </div>
  );

  if (!user) return shell(<p className="text-sm">Please sign in to leave a review.</p>);
  if (!jobId) return shell(<p className="text-sm">This review link is invalid or incomplete.</p>);
  if (checking && !error) return shell(
    <span className="inline-flex items-center gap-2 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Verifying eligibility…
    </span>
  );

  /* ---------------- SUBMIT ---------------- */
  async function submitReview() {
    if (!text.trim()) {
      setError("Please write a few words about your experience.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      await addDoc(
        collection(db, "contractors", contractorId, "reviews"),
        {
          reviewerId: user!.uid,
          contractorId,
          jobId,
          rating,
          text: text.trim(),
          createdAt: serverTimestamp(),
        }
      );
      setDone(true);
      setTimeout(() => router.replace(`/contractor/${contractorId}`), 1400);
    } catch {
      setError("Couldn't submit your review. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return shell(
      <div className="flex flex-col items-center gap-3">
        <CheckCircle2 className="w-12 h-12" style={{ color: '#34d399' }} />
        <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Thank you!</p>
        <p className="text-sm">Your review helps other homeowners hire with confidence.</p>
      </div>
    );
  }

  const shownRating = hoverRating || rating;

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <Link
          href={`/contractor/${contractorId}`}
          className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-text-4)' }}
        >
          <ChevronLeft className="w-4 h-4" /> Back to contractor
        </Link>

        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Leave a review</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-4)' }}>
            Reviews are tied to real completed jobs — your honest take helps the whole community.
          </p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Star rating */}
        <div className="card p-5">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-2)' }}>How was it?</p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  className="w-8 h-8"
                  style={{
                    color: n <= shownRating ? '#fbbf24' : 'var(--color-border)',
                    fill: n <= shownRating ? '#fbbf24' : 'transparent',
                  }}
                />
              </button>
            ))}
            <span className="ml-2 text-sm font-medium" style={{ color: 'var(--color-text-3)' }}>
              {RATING_LABEL[shownRating]}
            </span>
          </div>
        </div>

        {/* Review text */}
        <div className="card p-5">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-2)' }}>Your review</p>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl p-3 text-sm outline-none resize-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="What went well? Was the pro on time, tidy, fairly priced? Anything the next homeowner should know…"
          />
        </div>

        <button
          onClick={submitReview}
          disabled={submitting}
          className="btn btn-primary btn-full btn-lg"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
