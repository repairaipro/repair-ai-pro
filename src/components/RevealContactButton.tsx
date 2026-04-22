"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/db";

type Props = {
  jobId: string;
  contractorId: string;
};

type Contact = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export default function RevealContactButton({ jobId, contractorId }: Props) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contact, setContact] = useState<Contact | null>(null);

  const isAuthorized = user?.uid === contractorId;

  /* ---------------- LOAD CONTACT IF ALREADY REVEALED ---------------- */
  useEffect(() => {
    if (!user || !isAuthorized) return;

    async function loadIfRevealed() {
      try {
        const contactRef = doc(db, "jobs", jobId, "private", "contact");
        const snap = await getDoc(contactRef);

        if (snap.exists()) {
          setContact(snap.data() as Contact);
        }
      } catch {
        // silently ignore — rules will block if not allowed
      }
    }

    loadIfRevealed();
  }, [user, jobId, isAuthorized]);

  /* ---------------- REVEAL ACTION ---------------- */
  async function reveal() {
    setError("");
    setLoading(true);

    try {
      if (!user) throw new Error("Please sign in.");
      if (!isAuthorized) throw new Error("Forbidden.");

      // 1️⃣ Create reveal gate doc (rules-enforced)
      const revealRef = doc(
        db,
        "jobs",
        jobId,
        "contactReveals",
        contractorId
      );

      await setDoc(
        revealRef,
        { createdAt: serverTimestamp() },
        { merge: false }
      );

      // 2️⃣ Attempt to read contact (rules decide)
      const contactRef = doc(db, "jobs", jobId, "private", "contact");
      const snap = await getDoc(contactRef);

      if (!snap.exists()) {
        throw new Error("Contact not available yet.");
      }

      setContact(snap.data() as Contact);
    } catch (e: any) {
      setError(e?.message || "Unable to reveal contact.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-indigo-300 font-semibold">Customer Contact</p>
          <p className="text-xs text-gray-400">
            Proof-of-work verification required.
          </p>
        </div>

        <button
          type="button"
          onClick={reveal}
          disabled={loading || !!contact}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs px-3 py-2 rounded-lg"
        >
          {contact ? "Revealed" : loading ? "Checking..." : "Reveal Contact"}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {contact && (
        <div className="text-sm text-gray-200 space-y-1">
          {contact.name && (
            <p>
              <span className="text-gray-400">Name: </span>
              {contact.name}
            </p>
          )}

          {contact.email ? (
            <p>
              <span className="text-gray-400">Email: </span>
              <span className="text-green-300">{contact.email}</span>
            </p>
          ) : (
            <p className="text-yellow-300 text-xs">
              No email on file.
            </p>
          )}

          {contact.phone ? (
            <p>
              <span className="text-gray-400">Phone: </span>
              <span className="text-green-300">{contact.phone}</span>
            </p>
          ) : (
            <p className="text-yellow-300 text-xs">
              No phone on file.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
