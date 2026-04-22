"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/db";

type Props = {
  jobId: string;
  status: string;
  contractorId?: string;
  jobOwnerId: string;
};

export default function JobReviewCard({ jobId, status, contractorId, jobOwnerId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string>("");

  const canReview = useMemo(() => {
    return (
      !!user &&
      user.uid === jobOwnerId &&
      status === "completed_confirmed" &&
      !!contractorId
    );
  }, [user, jobOwnerId, status, contractorId]);

  useEffect(() => {
    async function check() {
      if (!user) return;
      if (!jobId) return;
      try {
        const q = query(
          collection(db, "jobs", jobId, "reviews"),
          where("reviewerId", "==", user.uid),
          limit(1)
        );
        const snap = await getDocs(q);
        setAlreadyReviewed(!snap.empty);
      } catch {
        // ignore
      }
    }
    check();
  }, [user, jobId]);

  async function submit() {
    if (!canReview || !contractorId) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          reviewerId: user!.uid,
          rating,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Review failed");
      setAlreadyReviewed(true);
      setMsg("✅ Review submitted. Thank you!");
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!canReview) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-indigo-300 font-semibold">Leave a review</p>
          <p className="text-xs text-gray-400">
            Reviews build contractor reputation and keep the marketplace honest.
          </p>
        </div>
        {alreadyReviewed ? (
          <span className="text-xs text-green-400">Reviewed</span>
        ) : null}
      </div>

      {alreadyReviewed ? null : (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-300">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="bg-gray-950 border border-gray-800 rounded-md px-2 py-1 text-sm"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} ⭐
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What went well? What should future customers know?"
            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-white"
            rows={3}
            maxLength={1000}
          />

          <button
            onClick={submit}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 rounded-lg text-sm"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </>
      )}

      {msg ? <p className="text-xs text-gray-300">{msg}</p> : null}
    </div>
  );
}
