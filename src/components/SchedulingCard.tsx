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
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold" style={{ color: '#818cf8' }}>Scheduling</p>
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            Propose a time in-app. Acceptance locks the appointment to this job.
          </p>
        </div>
        <div className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
          TZ: {timezone}
        </div>
      </div>

      {!isParticipant ? (
        <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
          Claim or own the job to schedule.
        </p>
      ) : (
        <>
          {/* Latest appointment summary */}
          {latest ? (
            <div className="rounded-lg p-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>
                  <span style={{ color: 'var(--color-text-4)' }}>Latest:</span>{" "}
                  {fmt(latest.startAt)} → {fmt(latest.endAt)}
                </p>
                <span className="text-[10px] uppercase" style={{ color: 'var(--color-text-4)' }}>
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
                    className="text-white text-xs px-3 py-2 rounded-lg disabled:opacity-60 transition-opacity"
                    style={{ background: '#059669' }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setStatus(latest.id, "declined")}
                    className="btn btn-secondary btn-sm"
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
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel appointment
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              No appointment yet. Propose one below.
            </p>
          )}

          {/* Propose appointment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>Start</label>
              <input
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                className="w-full mt-1 rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>End</label>
              <input
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                className="w-full mt-1 rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={propose}
            disabled={loading || !startLocal || !endLocal}
            className="btn btn-primary btn-sm"
          >
            {loading ? "Saving..." : "Propose appointment"}
          </button>

          {error ? <p className="text-xs" style={{ color: '#f87171' }}>{error}</p> : null}
        </>
      )}
    </div>
  );
}