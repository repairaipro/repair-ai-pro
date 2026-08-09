"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Search, CheckCircle, Circle } from "lucide-react";

type Contractor = {
  id:             string;
  name?:          string;
  trade?:         string;
  city?:          string;
  availability?:  string;
  avgRating?:     number;
  reviewCount?:   number;
  jobsCompleted?: number;
  trustScore?:    number;
  verified?:      boolean;
  claimedByUid?:  string;
};

const AVAIL_STYLES: Record<string, { color: string; label: string }> = {
  available: { color: '#34d399', label: 'Available' },
  busy:      { color: '#fbbf24', label: 'Busy' },
  offline:   { color: '#6b7280', label: 'Offline' },
};

export default function AdminContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState<"all" | "unverified" | "verified">("all");

  useEffect(() => {
    return onSnapshot(collection(db, "contractors"), (snap) => {
      setContractors(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => {
      // Defensive — avoids an uncaught console error on any transient read failure.
    });
  }, []);

  async function toggleVerified(c: Contractor) {
    await updateDoc(doc(db, "contractors", c.id), { verified: !c.verified });
  }

  const filtered = contractors
    .filter((c) => !c.claimedByUid)
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Contractors</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
          {contractors.filter(c => !c.claimedByUid).length} registered · {contractors.filter(c => c.verified && !c.claimedByUid).length} verified
        </p>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-4)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, trade, city…"
            className="input pl-8 text-sm"
            style={{ width: '220px' }}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "unverified", "verified"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all duration-150"
              style={{
                background: filter === f ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-2)',
                border: filter === f ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
                color: filter === f ? '#a5b4fc' : 'var(--color-text-4)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {["Name", "Trade / City", "Stats", "Availability", "Verified"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-4)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--color-text-4)' }}>
                  No contractors match
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const avail = AVAIL_STYLES[c.availability ?? "offline"] ?? AVAIL_STYLES.offline;
              return (
                <tr
                  key={c.id}
                  style={{ borderTop: '1px solid var(--color-border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{c.name ?? "Unnamed"}</p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-text-4)' }}>{c.id.slice(0,10)}…</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>{c.trade ?? "—"}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{c.city ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: '#fbbf24' }}>★ {c.avgRating?.toFixed(1) ?? "—"} ({c.reviewCount ?? 0})</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
                      {c.jobsCompleted ?? 0} jobs · Trust: {c.trustScore ?? 0}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: avail.color }} />
                      <span className="text-xs font-medium" style={{ color: avail.color }}>{avail.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVerified(c)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
                      style={c.verified
                        ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
                        : { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-4)' }
                      }
                    >
                      {c.verified
                        ? <><CheckCircle className="w-3 h-3" /> Verified</>
                        : <><Circle className="w-3 h-3" /> Verify</>
                      }
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
