"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import Link from "next/link";

type Job = {
  id:            string;
  description:   string;
  trade?:        string;
  status:        string;
  userId?:       string;
  claimedBy?:    string;
  paymentStatus?: string;
  paymentAmountUsd?: number;
  createdAt?:    any;
};

const STATUS_COLOR: Record<string, string> = {
  triaged:     "bg-yellow-500/20 text-yellow-400",
  accepted:    "bg-blue-500/20 text-blue-400",
  in_progress: "bg-indigo-500/20 text-indigo-400",
  completed:   "bg-orange-500/20 text-orange-400",
  confirmed:   "bg-green-500/20 text-green-400",
  disputed:    "bg-orange-600/20 text-orange-500",
  cancelled:   "bg-gray-600/20 text-gray-500",
  verified:    "bg-emerald-500/20 text-emerald-400",
};

function timeAgo(ts: any): string {
  try {
    const d = ts?.toDate?.() ?? null;
    if (!d) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

export default function AdminJobsPage() {
  const [jobs,   setJobs]   = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, []);

  const statuses = ["all", "triaged", "accepted", "in_progress", "completed", "confirmed", "disputed", "cancelled"];

  const filtered = jobs.filter((j) => {
    const matchStatus = filter === "all" || j.status === filter;
    const matchSearch = !search.trim() || j.description?.toLowerCase().includes(search.toLowerCase()) || j.trade?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Jobs</h1>
        <p className="text-sm text-gray-500 mt-0.5">{jobs.length} total jobs (latest 100)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs…"
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-48"
        />
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition ${
                filter === s ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Job</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">When</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-600 text-sm">No jobs match</td></tr>
            )}
            {filtered.map((job) => (
              <tr key={job.id} className="hover:bg-gray-800/50 transition">
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="text-white text-xs font-medium truncate">{job.description}</p>
                  <p className="text-gray-600 text-[10px] font-mono mt-0.5">{job.id.slice(0, 10)}…</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{job.trade ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[job.status] ?? "bg-gray-700 text-gray-400"}`}>
                    {job.status?.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {job.paymentAmountUsd ? (
                    <span className="text-xs text-gray-300">
                      ${job.paymentAmountUsd.toFixed(2)}
                      <span className={`ml-1 text-[10px] ${job.paymentStatus === "released" ? "text-green-400" : job.paymentStatus === "held" ? "text-yellow-400" : "text-gray-600"}`}>
                        ({job.paymentStatus})
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">No payment</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{timeAgo(job.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/chat?job=${job.id}`}
                    target="_blank"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
