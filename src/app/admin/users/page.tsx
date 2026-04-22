"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

type UserRecord = {
  uid:          string;
  email?:       string;
  displayName?: string;
  creationTime?: string;
  lastSignIn?:  string;
  disabled?:    boolean;
};

export default function AdminUsersPage() {
  const { user }              = useAuth();
  const [users,   setUsers]   = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token: string) =>
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { setUsers(d.users ?? []); setLoading(false); })
        .catch((e) => { setError(e.message); setLoading(false); })
    );
  }, [user]);

  const filtered = users.filter((u) =>
    !search.trim() ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} registered users</p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email or name…"
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-64"
      />

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">UID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Sign In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-600 text-sm">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-600 text-sm">No users found</td></tr>
            )}
            {filtered.map((u) => (
              <tr key={u.uid} className="hover:bg-gray-800/50 transition">
                <td className="px-4 py-3">
                  <p className="text-white text-sm">{u.displayName ?? u.email ?? "Anonymous"}</p>
                  {u.displayName && <p className="text-gray-500 text-xs">{u.email}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-600 text-[10px] font-mono">{u.uid.slice(0, 14)}…</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.creationTime ? new Date(u.creationTime).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
