"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";

type Contractor = {
  id:            string;
  name?:         string;
  trade?:        string;
  city?:         string;
  availability?: string;
  avgRating?:    number;
  reviewCount?:  number;
  jobsCompleted?: number;
  trustScore?:   number;
  verified?:     boolean;
  claimedByUid?: string;
  createdAt?:    any;
};

export default function AdminContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState<"all" | "unverified" | "verified">("all");

  useEffect(() => {
    return onSnapshot(collection(db, "contractors"), (snap) => {
      setContractors(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, []);

  async function toggleVerified(contractor: Contractor) {
    await updateDoc(doc(db, "contractors", contractor.id), {
      verified: !contractor.verified,
    });
  }

  const filtered = contractors
    .filter((c) => !c.claimedByUid) // hide merged/claimed dupes
    .filter((c) => {
      const matchFilter =
        filter === "all" ? true :
        filter === "verified" ? c.verified :
        !c.verified;
      const matchSearch = !search.trim() ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.trade?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });

  const AVAIL_COLOR: Record<string, string> = {
    available: "text-green-400",
    busy:      "text-orange-400",
    offline:   "text-gray-500",
  };

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Contractors</h1>
        <p className="text-sm text-gray-500 mt-0.5">{contractors.length} registered</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, trade, city…"
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-52"
        />
        {(["all", "unverified", "verified"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              filter === f ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trade / City</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stats</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-600 text-sm">No contractors match</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-800/50 transition">
                <td className="px-4 py-3">
                  <p className="text-white text-sm font-medium">{c.name ?? "Unnamed"}</p>
                  <p className="text-gray-600 text-[10px] font-mono">{c.id.slice(0, 10)}…</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-300">{c.trade ?? "—"}</p>
                  <p className="text-xs text-gray-500">{c.city ?? "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-yellow-400">★ {c.avgRating?.toFixed(1) ?? "—"} ({c.reviewCount ?? 0})</p>
                  <p className="text-xs text-gray-500">{c.jobsCompleted ?? 0} jobs · Trust: {c.trustScore ?? 0}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium capitalize ${AVAIL_COLOR[c.availability ?? "offline"] ?? "text-gray-500"}`}>
                    {c.availability ?? "offline"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleVerified(c)}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition ${
                      c.verified
                        ? "bg-green-900/40 text-green-400 hover:bg-red-900/40 hover:text-red-400"
                        : "bg-gray-800 text-gray-400 hover:bg-green-900/40 hover:text-green-400"
                    }`}
                  >
                    {c.verified ? "✓ Verified" : "Verify"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
