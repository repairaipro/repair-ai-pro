"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";

type SearchResult = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number;
  detectedTrade: string;
};

export type ImportedBusiness = {
  placeId: string;
  name: string;
  phone: string;
  city: string;
  zipCode: string;
  fullAddress: string;
  website: string;
  rating: number | null;
  reviewCount: number;
  photoUrl: string | null;
  detectedTrade: string;
  lat: number | null;
  lng: number | null;
};

type Duplicate = {
  uid: string;
  name: string;
  city: string;
  phone: string;
  trade: string;
  photoUrl: string;
  matchReason: "phone" | "name" | "placeId";
};

type Props = {
  onImport: (data: ImportedBusiness) => void;
};

const REASON_LABEL: Record<Duplicate["matchReason"], string> = {
  phone:   "Same phone number",
  name:    "Similar name & city",
  placeId: "Same Google listing",
};

export default function BusinessImportWidget({ onImport }: Props) {
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState("");

  // Duplicate / claim state
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [claimTarget, setClaimTarget] = useState<Duplicate | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !user) return;
    setSearching(true);
    setResults([]);
    setSearchError("");

    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/places/search?query=${encodeURIComponent(query.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setSearchError("No businesses found. Try a more specific name or add your city.");
    } catch (err: any) {
      setSearchError(err.message ?? "Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  async function selectBusiness(result: SearchResult) {
    if (!user) return;
    setLoadingId(result.placeId);
    setSearchError("");

    try {
      const token = await user.getIdToken();

      // 1. Fetch full details
      const detailsRes = await fetch(
        `/api/places/details?placeId=${result.placeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const detailsData = await detailsRes.json();
      if (!detailsRes.ok) throw new Error(detailsData.error ?? "Failed to load business details");

      const details = detailsData.details;

      const imported: ImportedBusiness = {
        ...details,
        detectedTrade: result.detectedTrade,
      };

      // 2. Check for duplicates
      const dupRes = await fetch("/api/contractors/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:    imported.name,
          phone:   imported.phone,
          city:    imported.city,
          placeId: imported.placeId,
        }),
      });
      const dupData = await dupRes.json();
      const found: Duplicate[] = dupData.duplicates ?? [];

      if (found.length > 0) {
        setDuplicates(found);
        setResults([]);
        // Still surface the imported data — user may want to continue
        onImport(imported);
        return;
      }

      // No duplicates — import straight away
      onImport(imported);
      setResults([]);
      setQuery("");
    } catch (err: any) {
      setSearchError(err.message ?? "Failed to import business.");
    } finally {
      setLoadingId(null);
    }
  }

  async function claimBusiness(dup: Duplicate) {
    if (!user) return;
    setClaiming(true);
    setClaimTarget(dup);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/contractors/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUid: dup.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Claim failed");
      setClaimDone(true);
      setDuplicates([]);
    } catch (err: any) {
      setSearchError(err.message ?? "Claim failed. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  /* ── Claim success ────────────────────────────────────────────────────── */
  if (claimDone) {
    return (
      <div className="bg-green-950 border border-green-700 rounded-xl p-4 text-sm text-green-300 space-y-1">
        <p className="font-semibold">✓ Business successfully claimed!</p>
        <p className="text-green-400 text-xs">
          Your stats and reviews from the existing listing have been merged into your account.
          Refresh the page to see the updated profile.
        </p>
      </div>
    );
  }

  /* ── Duplicate warning ────────────────────────────────────────────────── */
  if (duplicates.length > 0) {
    return (
      <div className="bg-amber-950 border border-amber-700 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-amber-300">⚠ This business may already exist</p>
          <p className="text-xs text-amber-400 mt-0.5">
            We found {duplicates.length === 1 ? "a listing" : "listings"} that match{duplicates.length === 1 ? "es" : ""} your business.
            If one of these is you, claim it to merge the review history and stats into your account.
          </p>
        </div>

        <div className="space-y-2">
          {duplicates.map((dup) => (
            <div key={dup.uid} className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
              {dup.photoUrl ? (
                <img src={dup.photoUrl} alt={dup.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">👷</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{dup.name}</p>
                <p className="text-xs text-gray-400">{dup.trade}{dup.city ? ` • ${dup.city}` : ""}</p>
                <p className="text-[10px] text-amber-500 mt-0.5">{REASON_LABEL[dup.matchReason]}</p>
              </div>
              <button
                onClick={() => claimBusiness(dup)}
                disabled={claiming}
                className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
              >
                {claiming && claimTarget?.uid === dup.uid ? "Claiming…" : "Claim"}
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setDuplicates([])}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            None of these are me — continue with my new profile
          </button>
        </div>

        {searchError && (
          <p className="text-xs text-red-400">{searchError}</p>
        )}
      </div>
    );
  }

  /* ── Search UI ────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your business name + city, e.g. 'Joe's Plumbing Austin'"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600"
        />
        <button
          type="submit"
          disabled={!query.trim() || searching}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 px-4 py-2.5 rounded-lg text-sm font-medium transition flex-shrink-0"
        >
          {searching ? <span className="animate-spin inline-block">⏳</span> : "Search"}
        </button>
      </form>

      {searchError && (
        <p className="text-xs text-red-400">{searchError}</p>
      )}

      {results.length > 0 && (
        <div className="border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-800">
          {results.map((r) => (
            <button
              key={r.placeId}
              type="button"
              onClick={() => selectBusiness(r)}
              disabled={loadingId === r.placeId}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left transition disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">
                🏢
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{r.name}</p>
                <p className="text-xs text-gray-500 truncate">{r.address}</p>
                {r.detectedTrade && (
                  <p className="text-[10px] text-indigo-400 mt-0.5">{r.detectedTrade}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {r.rating != null && (
                  <p className="text-xs text-yellow-400">⭐ {r.rating.toFixed(1)}</p>
                )}
                {r.reviewCount > 0 && (
                  <p className="text-[10px] text-gray-600">{r.reviewCount} reviews</p>
                )}
                {loadingId === r.placeId ? (
                  <p className="text-[10px] text-indigo-400 animate-pulse mt-1">Loading…</p>
                ) : (
                  <p className="text-[10px] text-gray-600 mt-1">Select →</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
