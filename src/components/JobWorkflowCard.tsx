"use client";

import { JobStatus } from "@/types/firestore";

const STATUS_LABELS: Record<JobStatus, string> = {
  // Core lifecycle
  draft: "Draft",
  triaged: "AI reviewing your request",
  matched: "Matching contractors",
  accepted: "Contractor on the way",
  in_progress: "Work in progress",
  completed: "Work completed",
  confirmed: "Completion confirmed",
  // Legacy / alternative claim flow
  open: "Open — awaiting contractor",
  claimed: "Claimed by contractor",
  // Extended inspection / quote flow
  contacted: "Contractors contacted",
  inspection_scheduled: "Inspection scheduled",
  quote_proposed: "Quote proposed",
  approved: "Job approved",
  verified: "Verified by user",
  // Terminal
  closed: "Job closed",
  cancelled: "Job cancelled",
};

const NEXT_ACTIONS: Partial<Record<JobStatus, string>> = {
  triaged: "Review matched contractors",
  matched: "Message a contractor",
  open: "Wait for a contractor to claim",
  accepted: "Contractor is coming — get ready",
  contacted: "Schedule inspection",
  inspection_scheduled: "Wait for quote",
  quote_proposed: "Approve or request changes",
  approved: "Work scheduled",
  completed: "Confirm the work is done",
};

export default function JobWorkflowCard({
  status,
}: {
  status: JobStatus;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
      <p className="text-xs text-gray-400 uppercase">Job Status</p>

      <p className="text-lg font-semibold text-indigo-400">
        {STATUS_LABELS[status]}
      </p>

      {NEXT_ACTIONS[status] && (
        <p className="text-sm text-gray-300">
          👉 Next step:{" "}
          <span className="text-indigo-300 font-medium">
            {NEXT_ACTIONS[status]}
          </span>
        </p>
      )}
    </div>
  );
}
