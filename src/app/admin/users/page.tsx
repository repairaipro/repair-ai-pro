"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Search } from "lucide-react";

type UserRecord = {
  uid:           string;
  email?:        string;
  displayName?:  string;
  creationTime?: string;
  lastSignIn?:   string;
  disabled?:     boolean;
};

export default function AdminUsersPage() {
  const { user }             = useAuth();
  const [users,   setUsers]  = useState<UserRecord[]>([]);
  const [loading, setLoading]= useState(true);
  const [search,  setSearch] = useState("");
  const [error,   setError]  = useState<string | null>(null);

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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Users</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
          {users.length} registered users
        </p>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-4)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="input pl-8 text-sm"
            style={{ width: '260px' }}
          />
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
          {filtered.length} of {users.length}
        </span>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {["User", "UID", "Joined", "Last Sign In"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-4)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="text-center py-12">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                    style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-sm" style={{ color: 'var(--color-text-4)' }}>
                  No users found
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr
                key={u.uid}
                style={{ borderTop: '1px solid var(--color-border)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {u.displayName ?? u.email ?? "Anonymous"}
                  </p>
                  {u.displayName && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{u.email}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-4)' }}>{u.uid.slice(0,16)}…</p>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-4)' }}>
                  {u.creationTime ? new Date(u.creationTime).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-4)' }}>
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
