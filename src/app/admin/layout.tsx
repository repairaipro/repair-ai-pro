"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const NAV = [
  { href: "/admin",            label: "Overview",     icon: "📊" },
  { href: "/admin/jobs",       label: "Jobs",         icon: "📋" },
  { href: "/admin/disputes",   label: "Disputes",     icon: "⚠️" },
  { href: "/admin/contractors",label: "Contractors",  icon: "👷" },
  { href: "/admin/users",      label: "Users",        icon: "👥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user }    = useAuth();
  const router      = useRouter();
  const pathname    = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    const isAdmin = ADMIN_UIDS.includes(user.uid) || user.email?.endsWith("@repair-ai.admin");
    if (!isAdmin) {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [user, router]);

  if (!user || !ready) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Checking admin access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Admin Panel</p>
          <p className="text-[10px] text-gray-600 mt-0.5 truncate">{user.email}</p>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-indigo-600 text-white font-medium"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-gray-800">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition">
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
