"use client";

import Link from "next/link";
import ContractorInvitationInbox from "@/components/ContractorInvitationInbox";
import { useAuth } from "@/lib/auth";
import { Inbox, Edit, Briefcase, CheckCircle, Brain, Star, Trophy } from "lucide-react";

export default function ContractorInboxPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}
              >
                <Inbox className="w-4 h-4" style={{ color: '#fb923c' }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Contractor Inbox</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
              Job invitations matched to your trade and location.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/contractor-profile" className="btn btn-secondary btn-sm">
              <Edit className="w-3.5 h-3.5" /> Edit Profile
            </Link>
            <Link href="/jobs" className="btn btn-primary btn-sm">
              <Briefcase className="w-3.5 h-3.5" /> Browse Jobs
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: '#a5b4fc' }}>How job invitations work</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: <Brain className="w-4 h-4" />, color: '#818cf8', bg: 'rgba(99,102,241,0.1)', text: "Homeowners post a job — our AI detects the trade and location" },
              { icon: <Inbox className="w-4 h-4" />, color: '#fb923c', bg: 'rgba(249,115,22,0.1)', text: "You get invited based on your trade, city, rating, and history" },
              { icon: <CheckCircle className="w-4 h-4" />, color: '#34d399', bg: 'rgba(16,185,129,0.1)', text: "Accept to claim the job and start chatting with the homeowner" },
              { icon: <Star className="w-4 h-4" />, color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', text: "Complete the job and collect a 5-star review to boost your ranking" },
            ].map(({ icon, color, bg, text }, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: bg, color }}
                >
                  {icon}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-3)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <ContractorInvitationInbox />
      </div>
    </div>
  );
}
