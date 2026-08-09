"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/db";

type Props = {
  jobId: string;
  jobOwnerId: string;
  contractorId?: string;
  jobStatus: string;
};

type Review = {
  id: string;
  rating: number;
  text?: string;
  reviewerId: string;
};

export default function ReviewCard({ jobId, jobOwnerId, contractorId, jobStatus }: Props) {
  const { user } = useAuth();

  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [rating,     setRating]     = useState(5);
  const [text,       setText]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");

  const isOwner  = user?.uid === jobOwnerId;
  const canReview =
    isOwner &&
    !!contractorId &&
    ["confirmed", "verified"].includes(jobStatus);

  // Load existing review
  useEffect(() => {
    if (!jobId) return;
    const unsub = onSnapshot(collection(db, "jobs", jobId, "reviews"), (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setExistingReview({ id: d.id, ...(d.data() as any) });
      }
    }, () => {
      // Firestore rules restrict reads to job participants (owner/claimed
      // contractor) — a contractor just browsing/bidding on an open job
      // isn't one yet, so this denies until they're selected. Expected, not
      // an error: swallow it instead of leaving an uncaught console error.
    });
    return () => unsub();
  }, [jobId]);

  async function submit() {
    if (!user || !canReview || !contractorId) return;
    setError("");
    setSubmitting(true);

    try {
      const token = await user.getIdToken();
      const res   = await fetch(`/api/jobs/${jobId}/submit-review`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contractorId,
          reviewerId: user.uid,
          rating,
          text: text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit review");
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message ?? "Unable to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Don't render at all unless confirmed
  if (!["confirmed", "verified"].includes(jobStatus)) return null;
  // Only show to owner
  if (!isOwner) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <p className="text-indigo-300 font-semibold text-sm">Leave a Review</p>
      <p className="text-xs text-gray-500">
        Your review helps other homeowners choose the right contractor.
      </p>

      {existingReview || submitted ? (
        <div className="space-y-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`text-xl ${n <= (existingReview?.rating ?? rating) ? "text-yellow-400" : "text-gray-700"}`}>
                ★
              </span>
            ))}
          </div>
          {existingReview?.text && (
            <p className="text-sm text-gray-300">{existingReview.text}</p>
          )}
          <p className="text-xs text-green-400">✓ Review submitted — thank you!</p>
        </div>
      ) : canReview ? (
        <>
          {/* Star rating */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl transition ${n <= rating ? "text-yellow-400" : "text-gray-700 hover:text-yellow-600"}`}
              >
                ★
              </button>
            ))}
            <span className="text-xs text-gray-500 self-center ml-2">
              {rating === 5 ? "Excellent" : rating === 4 ? "Good" : rating === 3 ? "Average" : rating === 2 ? "Poor" : "Terrible"}
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell others about your experience (optional)…"
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />

          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </>
      ) : (
        <p className="text-xs text-gray-500">
          Reviews are available after the job is confirmed complete.
        </p>
      )}
    </div>
  );
}
