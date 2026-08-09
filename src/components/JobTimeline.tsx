"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/db";

type TimelineItem = {
  id: string;
  type: "photo" | "note";
  stage: "start" | "progress" | "completion";
  text?: string;
  fileUrl?: string;
  uploadedBy: string;
  createdAt?: any;
};

export default function JobTimeline({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "jobs", jobId, "attachments"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: TimelineItem[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
      setItems(data);
    }, () => {
      // Firestore rules restrict reads to job participants (owner/claimed
      // contractor) — a contractor just browsing/bidding on an open job
      // isn't one yet, so this denies until they're selected. Expected, not
      // an error: swallow it instead of leaving an uncaught console error.
    });

    return () => unsub();
  }, [jobId]);

  if (items.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No work activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="border-l-2 border-indigo-600 pl-4 relative"
        >
          <div className="absolute -left-[6px] top-1.5 w-3 h-3 bg-indigo-600 rounded-full" />

          <p className="text-xs uppercase text-gray-400 mb-1">
            {item.stage}
          </p>

          {item.type === "note" && (
            <p className="text-sm text-gray-200">
              📝 {item.text}
            </p>
          )}

          {item.type === "photo" && item.fileUrl && (
            <img
              src={item.fileUrl}
              alt="Work proof"
              className="rounded-lg border border-gray-700 max-w-xs"
            />
          )}
        </div>
      ))}
    </div>
  );
}
