"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/db";

type Props = {
  jobId: string;
  jobOwnerId: string; // jobs.userId
  claimedBy?: string; // jobs.claimedBy
};

type ApptStatus = "proposed" | "accepted" | "declined" | "cancelled";

type Appointment = {
  id: string;
  startAt: Timestamp;
  endAt: Timestamp;
  timezone: string;
  status: ApptStatus;
  createdBy: string;
  createdAt?: Timestamp;
};

function fmt(ts?: Timestamp) {
  if (!ts) return "";
  const d = ts.toDate();
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SchedulingCard({ jobId, jobOwnerId, claimedBy }: Props) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [appts, setAppts] = useState<Appointment[]>([]);

  // Simple form state (keep it lightweight)
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
    []
  );

  const isOwner = user?.uid === jobOwnerId;
  const isContractor = !!claimedBy && user?.uid === claimedBy;
  const isParticipant = isOwner || isContractor;

  useEffect(() => {
    if (!jobId) return;

    const q = query(
      collection(db, "jobs", jobId, "appointments"),
      orderBy("startAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Appointment[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setAppts(rows);
      },
      () => {
        // If rules block read, fail closed silently
        setAppts([]);
      }
    );

    return () => unsub();
  }, [jobId]);

  const latest = appts[0] ?? null;

  async function propose() {
    setError("");
    setLoading(true);
    try {
      if (!user) throw new Error("Please sign in.");
      if (!isParticipant) throw new Error("Not authorized for this job.");
      if (!startLocal || !endLocal) throw new Error("Pick a start and end time.");

      const start = new Date(startLocal);
      const end = new Date(endLocal);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("Invalid date/time.");
      }
      if (end <= start) throw new Error("End time must be after start time.");

      await addDoc(collection(db, "jobs", jobId, "appointments"), {
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),
        timezone,
        status: "proposed",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      setStartLocal("");
      setEndLocal("");
    } catch (e: any) {
      setError(e?.message || "Unable to propose.");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(apptId: string, status: ApptStatus) {
    setError("");
    setLoading(true);
    try {
      if (!user) throw new Error("Please sign in.");
      if (!isParticipant) throw new Error("Not authorized for this job.");

      await updateDoc(doc(db, "jobs", jobId, "appointments", apptId), {
        status,
      });
    } catch (e: any) {
      setError(e?.message || "Unable to update appointment.");
    } finally {
      setLoading(false);
    }
  }

  // Who should be able to accept/decline?
  // If OWNER proposed, CONTRACTOR can accept/decline; if CONTRACTOR proposed, OWNER can accept/decline.
  const canRespondToLatest =
    !!latest &&
    latest.status === "proposed" &&
    ((latest.createdBy === jobOwnerId && isContractor) ||
      (latest.createdBy === claimedBy && isOwner));

  const canCancelLatest =
    !!latest &&
    latest.status === "accepted" &&
    isParticipant; // either party can cancel accepted appt

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-indigo-300 font-semibold">Scheduling</p>
          <p className="text-xs text-gray-400">
            Propose a time in-app. Acceptance locks the appointment to this job.
          </p>
        </div>
        <div className="text-[10px] text-gray-500">
          TZ: {timezone}
        </div>
      </div>

      {!isParticipant ? (
        <p className="text-xs text-gray-400">
          Claim or own the job to schedule.
        </p>
      ) : (
        <>
          {/* Latest appointment summary */}
          {latest ? (
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-200">
                  <span className="text-gray-400">Latest:</span>{" "}
                  {fmt(latest.startAt)} → {fmt(latest.endAt)}
                </p>
                <span className="text-[10px] uppercase text-gray-400">
                  {latest.status}
                </span>
              </div>

              {/* Respond controls */}
              {canRespondToLatest && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setStatus(latest.id, "accepted")}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs px-3 py-2 rounded-lg"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setStatus(latest.id, "declined")}
                    className="bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-white text-xs px-3 py-2 rounded-lg"
                  >
                    Decline
                  </button>
                </div>
              )}

              {canCancelLatest && (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setStatus(latest.id, "cancelled")}
                    className="bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-white text-xs px-3 py-2 rounded-lg"
                  >
                    Cancel appointment
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              No appointment yet. Propose one below.
            </p>
          )}

          {/* Propose appointment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400">Start</label>
              <input
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">End</label>
              <input
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={propose}
            disabled={loading || !startLocal || !endLocal}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs px-3 py-2 rounded-lg"
          >
            {loading ? "Saving..." : "Propose appointment"}
          </button>

          {error ? <p className="text-red-400 text-xs">{error}</p> : null}
        </>
      )}
    </div>
  );
}