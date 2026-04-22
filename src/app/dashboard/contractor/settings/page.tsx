"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { StripeConnectOnboarding } from "@/components/StripeConnectOnboarding";
import { useRouter } from "next/navigation";
import type { ContractorProfile } from "@/lib/contractorProfile";

/**
 * Contractor Settings / Profile Page
 *
 * Displays:
 * - Profile information (read-only for now)
 * - Stripe Connect bank verification status
 * - Earning statistics (if available)
 */
export default function ContractorSettingsPage() {
  const { user, isContractor } = useAuth();
  const router = useRouter();
  const [contractor, setContractor] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedJobs: 0,
  });

  // Redirect non-contractors
  useEffect(() => {
    if (!loading && !isContractor()) {
      router.push("/dashboard");
    }
  }, [loading, isContractor, router]);

  // Load contractor profile
  useEffect(() => {
    if (!user) return;

    const loadContractor = async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/contractors/profile", {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setContractor(data);

          // TODO: Load earnings statistics from /api/contractors/earnings
        }
      } catch (err) {
        console.error("Failed to load contractor profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadContractor();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your contractor account and verification</p>
      </div>

      {/* Profile Information Card */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <p className="text-gray-900">{contractor.name || "Not set"}</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-900">{user?.email}</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <p className="text-gray-900">{contractor.phone || "Not set"}</p>
          </div>

          {/* Trade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trade / Specialty
            </label>
            <p className="text-gray-900">{contractor.trade || "Not set"}</p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Location
            </label>
            <p className="text-gray-900">{contractor.location || "Not set"}</p>
          </div>

          {/* Verification Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Status
            </label>
            <p className="text-gray-900">
              {contractor.onboardingComplete ? (
                <span className="text-green-600">✓ Onboarded</span>
              ) : (
                <span className="text-yellow-600">Pending onboarding</span>
              )}
            </p>
          </div>
        </div>

        {/* Edit Profile Button (future) */}
        <button
          disabled
          className="mt-6 px-4 py-2 bg-gray-200 text-gray-500 rounded cursor-not-allowed"
        >
          Edit Profile (Coming Soon)
        </button>
      </div>

      {/* Stripe Connect Onboarding */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Payment & Payouts</h2>
        <StripeConnectOnboarding />
      </div>

      {/* Earnings Summary (future) */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Earnings Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Pending Payouts</p>
            <p className="text-2xl font-bold">${stats.pendingPayouts.toFixed(2)}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Completed Jobs</p>
            <p className="text-2xl font-bold">{stats.completedJobs}</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Once your bank account is verified, payouts will appear here and be automatically
          sent to your bank account.
        </p>
      </div>
    </div>
  );
}
