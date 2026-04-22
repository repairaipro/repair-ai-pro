"use client";

import Link from "next/link";
import ContractorInvitationInbox from "@/components/ContractorInvitationInbox";
import { useAuth } from "@/lib/auth";

export default function ContractorInboxPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">Contractor Inbox 📬</h1>
          <p className="text-gray-500 text-sm mt-1">
            Job invitations matched to your trade and location.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/contractor-profile"
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm rounded-lg transition"
          >
            ✏️ Edit Profile
          </Link>
          <Link
            href="/jobs"
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm rounded-lg transition font-medium"
          >
            Browse Jobs
          </Link>
        </div>
      </div>

      {/* How it works banner — shown to all users as a quick reminder */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-400 space-y-1">
        <p className="font-medium text-gray-300">How job invitations work</p>
        <ul className="space-y-1 text-xs text-gray-500 mt-2">
          <li className="flex gap-2">
            <span className="text-indigo-400 flex-shrink-0">1.</span>
            Homeowners post a job — our AI detects the trade and location
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-400 flex-shrink-0">2.</span>
            You get invited based on your trade, city, rating, and acceptance history
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-400 flex-shrink-0">3.</span>
            Accept to claim the job and start chatting with the homeowner
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-400 flex-shrink-0">4.</span>
            Complete the job and collect a 5-star review to boost your ranking
          </li>
        </ul>
      </div>

      <ContractorInvitationInbox />
    </div>
  );
}
