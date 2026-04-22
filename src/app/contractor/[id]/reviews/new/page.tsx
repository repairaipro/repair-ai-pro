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

export default function NewReviewPage({ params }: { params: { id: string } }) {
  const contractorId = params.id;
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const jobId = searchParams.get("job");

  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

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

      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("You already reviewed this job.");
        router.replace(`/contractor/${contractorId}`);
      }

      setChecking(false);
    }

    verifyEligibility();
  }, [user, jobId, contractorId, router]);

  if (!user) {
    return (
      <div className="text-white p-6 text-center">
        Please sign in to leave a review.
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="text-white p-6 text-center">
        Invalid review link.
      </div>
    );
  }

  if (checking) {
    return (
      <div className="text-white p-6 text-center">
        Verifying eligibility…
      </div>
    );
  }

  /* ---------------- SUBMIT ---------------- */
  async function submitReview() {
    if (!text.trim()) {
      alert("Please enter review text.");
      return;
    }

    setSubmitting(true);

    await addDoc(
      collection(db, "contractors", contractorId, "reviews"),
      {
        reviewerId: user.uid,
        contractorId,
        jobId,
        rating,
        text,
        createdAt: serverTimestamp(),
      }
    );

    alert("Review submitted successfully!");
    router.replace(`/contractor/${contractorId}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
      <Link
        href={`/contractor/${contractorId}`}
        className="text-indigo-400 hover:underline"
      >
        ← Back to Contractor
      </Link>

      <h1 className="text-2xl font-bold text-indigo-400">
        Leave a Review
      </h1>

      {/* RATING */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
        <p className="font-semibold mb-2">Rating</p>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="bg-gray-800 p-2 rounded text-sm"
        >
          <option value={5}>⭐ 5 – Excellent</option>
          <option value={4}>⭐ 4 – Good</option>
          <option value={3}>⭐ 3 – Average</option>
          <option value={2}>⭐ 2 – Poor</option>
          <option value={1}>⭐ 1 – Terrible</option>
        </select>
      </div>

      {/* REVIEW */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
        <p className="font-semibold mb-2">Your Review</p>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-gray-800 p-3 rounded text-sm outline-none"
          placeholder="Describe your experience working with this contractor…"
        />
      </div>

      <button
        onClick={submitReview}
        disabled={submitting}
        className="w-full bg-indigo-600 py-3 rounded-xl text-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </div>
  );
}
