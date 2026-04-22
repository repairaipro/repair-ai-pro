"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getTrustScore, getTrustTier } from "@/lib/matching";
import BusinessImportWidget, { type ImportedBusiness } from "@/components/BusinessImportWidget";
import Link from "next/link";
import { TRADES } from "@/lib/constants";

type AvailabilityStatus = "available" | "busy" | "offline";

const AVAILABILITY_OPTIONS: {
  value: AvailabilityStatus;
  label: string;
  desc: string;
  dot: string;
  ring: string;
  bg: string;
}[] = [
  {
    value: "available",
    label: "Available",
    desc: "Actively accepting new jobs",
    dot: "bg-green-400",
    ring: "ring-green-500",
    bg: "bg-green-900/30 border-green-700 text-green-300",
  },
  {
    value: "busy",
    label: "Busy",
    desc: "Taking jobs but may be slow",
    dot: "bg-yellow-400",
    ring: "ring-yellow-500",
    bg: "bg-yellow-900/30 border-yellow-700 text-yellow-300",
  },
  {
    value: "offline",
    label: "Offline",
    desc: "Not receiving new invitations",
    dot: "bg-gray-500",
    ring: "ring-gray-600",
    bg: "bg-gray-800 border-gray-700 text-gray-400",
  },
];

/* ── Profile form shape ──────────────────────────────────────────────────── */

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  trade: string;
  trades: string[];
  city: string;
  zipCode: string;
  serviceRadiusMiles: number;
  bio: string;
  photoUrl: string;
  hourly: string;
  experience: string;
  availability: AvailabilityStatus;
  googlePlaceId: string;
};

const DEFAULT_FORM: ProfileForm = {
  name: "",
  email: "",
  phone: "",
  trade: "",
  trades: [],
  city: "",
  zipCode: "",
  serviceRadiusMiles: 25,
  bio: "",
  photoUrl: "",
  hourly: "",
  experience: "",
  availability: "available",
  googlePlaceId: "",
};

/* ── Completeness calculation ────────────────────────────────────────────── */

type CompletenessField = {
  key: keyof ProfileForm | "photoUrl";
  label: string;
  critical: boolean;
};

const COMPLETENESS_FIELDS: CompletenessField[] = [
  { key: "name",               label: "Name",            critical: true  },
  { key: "trade",              label: "Primary Trade",   critical: true  },
  { key: "city",               label: "City",            critical: true  },
  { key: "zipCode",            label: "ZIP Code",        critical: true  },
  { key: "phone",              label: "Phone",           critical: false },
  { key: "bio",                label: "Bio",             critical: false },
  { key: "photoUrl",           label: "Profile Photo",   critical: false },
  { key: "hourly",             label: "Hourly Rate",     critical: false },
  { key: "experience",         label: "Years of Experience", critical: false },
];

function getCompleteness(form: ProfileForm) {
  const filled = COMPLETENESS_FIELDS.filter((f) => {
    const val = form[f.key as keyof ProfileForm];
    if (Array.isArray(val)) return val.length > 0;
    return typeof val === "string" ? val.trim() !== "" : Boolean(val);
  });
  const pct = Math.round((filled.length / COMPLETENESS_FIELDS.length) * 100);
  const missing = COMPLETENESS_FIELDS.filter((f) => {
    const val = form[f.key as keyof ProfileForm];
    if (Array.isArray(val)) return val.length === 0;
    return typeof val === "string" ? val.trim() === "" : !val;
  });
  return { pct, missing };
}

/* ── Cloudinary upload ───────────────────────────────────────────────────── */

async function uploadToCloudinary(file: File, token: string): Promise<string> {
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!signRes.ok) throw new Error("Failed to get upload signature");
  const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!uploadRes.ok) throw new Error("Cloudinary upload failed");
  const data = await uploadRes.json();
  return data.secure_url as string;
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-200">{title}</h2>
      {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function ContractorProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, jobsCompleted: 0, invitationAcceptCount: 0, invitationDeclineCount: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Load existing profile ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "contractors", user.uid));
      if (snap.exists()) {
        const d = snap.data() as any;
        setForm({
          name:               d.name               ?? user.displayName ?? "",
          email:              d.email              ?? user.email       ?? "",
          phone:              d.phone              ?? "",
          trade:              d.trade              ?? "",
          trades:             Array.isArray(d.trades) ? d.trades : [],
          city:               d.city               ?? "",
          zipCode:            d.zipCode            ?? "",
          serviceRadiusMiles: d.serviceRadiusMiles ?? 25,
          bio:                d.bio                ?? "",
          photoUrl:           d.photoUrl ?? d.photoURL ?? user.photoURL ?? "",
          hourly:             d.hourly != null ? String(d.hourly) : "",
          experience:         d.experience != null ? String(d.experience) : "",
          availability:       d.availability       ?? "available",
          googlePlaceId:      d.googlePlaceId      ?? "",
        });
        setStats({
          rating:                d.rating               ?? 0,
          reviewCount:           d.reviewCount          ?? 0,
          jobsCompleted:         d.jobsCompleted        ?? 0,
          invitationAcceptCount: d.invitationAcceptCount ?? 0,
          invitationDeclineCount:d.invitationDeclineCount ?? 0,
        });
      } else {
        setForm((prev) => ({
          ...prev,
          name:     user.displayName ?? "",
          email:    user.email       ?? "",
          photoUrl: user.photoURL    ?? "",
        }));
      }
    })();
  }, [user]);

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }

  function toggleSecondaryTrade(trade: string) {
    setForm((prev) => {
      const has = prev.trades.includes(trade);
      return {
        ...prev,
        trades: has ? prev.trades.filter((t) => t !== trade) : [...prev.trades, trade],
      };
    });
    setSaveStatus("idle");
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoUploading(true);
    try {
      const token = await user.getIdToken();
      const url = await uploadToCloudinary(file, token);
      set("photoUrl", url);
    } catch (err: any) {
      alert(err.message ?? "Photo upload failed. Please try again.");
    } finally {
      setPhotoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleGoogleImport(data: ImportedBusiness) {
    setForm((prev) => ({
      ...prev,
      name:              data.name      || prev.name,
      phone:             data.phone     || prev.phone,
      city:              data.city      || prev.city,
      zipCode:           data.zipCode   || prev.zipCode,
      photoUrl:          data.photoUrl  || prev.photoUrl,
      trade:             data.detectedTrade && (TRADES as readonly string[]).includes(data.detectedTrade)
                           ? data.detectedTrade
                           : prev.trade,
      googlePlaceId:     data.placeId,
    }));
    setSaveStatus("idle");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!form.trade) {
      setSaveStatus("error");
      setSaveError("Please select a primary trade before saving.");
      return;
    }
    if (!form.city.trim() && !form.zipCode.trim()) {
      setSaveStatus("error");
      setSaveError("Please enter at least a city or ZIP code so we can match you to nearby jobs.");
      return;
    }

    setSaving(true);
    setSaveStatus("idle");

    try {
      await setDoc(
        doc(db, "contractors", user.uid),
        {
          uid:               user.uid,
          name:              form.name.trim(),
          email:             form.email.trim(),
          phone:             form.phone.trim(),
          trade:             form.trade,
          trades:            form.trades,
          city:              form.city.trim(),
          zipCode:           form.zipCode.trim(),
          serviceRadiusMiles:form.serviceRadiusMiles,
          bio:               form.bio.trim(),
          photoUrl:          form.photoUrl,
          hourly:            form.hourly ? Number(form.hourly) : null,
          experience:        form.experience ? Number(form.experience) : null,
          availability:      form.availability,
          googlePlaceId:     form.googlePlaceId || null,
          updatedAt:         serverTimestamp(),
          lastActiveAt:      serverTimestamp(),
        },
        { merge: true }
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      setSaveStatus("error");
      setSaveError(err?.message ?? "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Auth guard ──────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Sign in to manage your contractor profile.</p>
        <Link href="/auth/signin" className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-lg text-sm font-medium transition">
          Sign In
        </Link>
      </div>
    );
  }

  /* ── Derived values ──────────────────────────────────────────────────── */

  const { pct, missing } = getCompleteness(form);
  const trustScore = getTrustScore({
    rating:                stats.rating,
    reviewCount:           stats.reviewCount,
    jobsCompleted:         stats.jobsCompleted,
    invitationAcceptCount: stats.invitationAcceptCount,
    invitationDeclineCount:stats.invitationDeclineCount,
  });
  const trustTier = getTrustTier(trustScore);
  const activeOpt = AVAILABILITY_OPTIONS.find((o) => o.value === form.availability) ?? AVAILABILITY_OPTIONS[0];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-400">Contractor Profile</h1>
            <p className="text-gray-500 text-sm mt-1">
              Your profile controls which jobs you get matched to.
            </p>
          </div>
          <Link
            href="/contractor-inbox"
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm rounded-lg transition"
          >
            ← My Inbox
          </Link>
        </div>

        {/* Profile Completeness */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">Profile Completeness</span>
            <span className={`text-sm font-bold ${pct >= 80 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
              {pct}%
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {missing.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {missing.map((f) => (
                <span
                  key={f.key}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    f.critical
                      ? "bg-red-900/30 text-red-400 border-red-800"
                      : "bg-gray-800 text-gray-500 border-gray-700"
                  }`}
                >
                  {f.critical ? "⚠ " : ""}{f.label}
                </span>
              ))}
            </div>
          )}
          {pct < 60 && (
            <p className="text-xs text-amber-400">
              Complete the red fields above — they're required for the matching system to find you jobs.
            </p>
          )}
        </div>

        <form onSubmit={saveProfile} className="space-y-6">

          {/* ── SECTION 0: GOOGLE IMPORT ─────────────────────────────── */}
          <div className="bg-gray-900 border border-indigo-900 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔍</span>
              <h2 className="text-base font-semibold text-indigo-300">Import from Google</h2>
              {form.googlePlaceId && (
                <span className="ml-auto text-[10px] bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">
                  ✓ Linked to Google
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Search for your business on Google to auto-fill your profile. If a listing already exists
              for your business, you can claim it and merge your review history.
            </p>
            <BusinessImportWidget onImport={handleGoogleImport} />
            {form.googlePlaceId && (
              <p className="text-[10px] text-gray-600 mt-2">
                Google Place ID: {form.googlePlaceId}
              </p>
            )}
          </div>

          {/* ── SECTION 1: AVAILABILITY ─────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <SectionHeader
              title="Availability Status"
              desc="This is the most important field. Offline contractors receive zero job invitations."
            />
            <div className="grid grid-cols-3 gap-3">
              {AVAILABILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("availability", opt.value)}
                  className={`p-3 rounded-xl border-2 text-center transition ${
                    form.availability === opt.value
                      ? `${opt.bg} ring-2 ${opt.ring}`
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${opt.dot}`} />
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
            {form.availability === "offline" && (
              <p className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-900 rounded-lg px-3 py-2">
                ⚠ You are offline. You will not appear in job matches or receive any invitations until you switch to Available or Busy.
              </p>
            )}
          </div>

          {/* ── SECTION 2: BASIC INFO ────────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <SectionHeader title="Basic Info" />

            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                {form.photoUrl ? (
                  <img
                    src={form.photoUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-3xl border-2 border-gray-700">
                    👷
                  </div>
                )}
                {photoUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <span className="animate-spin text-lg">⏳</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoUploading}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {photoUploading ? "Uploading…" : "Upload Photo"}
                </button>
                <p className="text-xs text-gray-600 mt-1.5">JPG or PNG. Shown on your public profile.</p>
              </div>
            </div>

            <Field label="Full Name / Business Name">
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. John's Plumbing Services"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(555) 555-5555"
                  type="tel"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </Field>
              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </Field>
            </div>
          </div>

          {/* ── SECTION 3: TRADE ─────────────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <SectionHeader
              title="Trade & Specialties"
              desc="Your primary trade must match the job trade exactly for you to be invited."
            />

            <Field
              label="Primary Trade"
              hint="This is the main filter — only jobs in this trade will match you."
            >
              <select
                value={form.trade}
                onChange={(e) => set("trade", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">— Select your trade —</option>
                {TRADES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field
              label="Additional Trades"
              hint="Check any other trades you also handle. You'll be matched for those jobs too."
            >
              <div className="flex flex-wrap gap-2 mt-1">
                {TRADES.filter((t) => t !== form.trade).map((t) => {
                  const active = form.trades.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleSecondaryTrade(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        active
                          ? "bg-indigo-900/50 border-indigo-600 text-indigo-300"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {active ? "✓ " : ""}{t}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          {/* ── SECTION 4: SERVICE AREA ──────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <SectionHeader
              title="Service Area"
              desc="We use your city and ZIP code to match you with nearby jobs. Fill in both for the best results."
            />

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="City"
                hint="Must match the city homeowners enter."
              >
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="e.g. Austin"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </Field>
              <Field label="ZIP Code">
                <input
                  value={form.zipCode}
                  onChange={(e) => set("zipCode", e.target.value)}
                  placeholder="e.g. 78701"
                  maxLength={10}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </Field>
            </div>

            <Field
              label={`Service Radius: ${form.serviceRadiusMiles} miles`}
              hint="How far you're willing to travel from your ZIP code."
            >
              <input
                type="range"
                min={5}
                max={75}
                step={5}
                value={form.serviceRadiusMiles}
                onChange={(e) => set("serviceRadiusMiles", Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                <span>5 mi</span>
                <span>75 mi</span>
              </div>
            </Field>
          </div>

          {/* ── SECTION 5: ABOUT & RATES ─────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <SectionHeader title="About You & Rates" />

            <Field label="Bio" hint="Tell homeowners what makes you great. 2–4 sentences works well.">
              <textarea
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="e.g. Licensed plumber with 12 years of experience serving the Austin area. Specialize in leak repair, remodels, and water heater installation. I offer free estimates and always clean up after myself."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Hourly Rate (USD)" hint="Shown as 'From $X/hr' on your listing.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    value={form.hourly}
                    onChange={(e) => set("hourly", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="85"
                    inputMode="numeric"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </Field>
              <Field label="Years of Experience">
                <input
                  value={form.experience}
                  onChange={(e) => set("experience", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 8"
                  inputMode="numeric"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </Field>
            </div>
          </div>

          {/* ── SECTION 6: STATS (read-only) ─────────────────────────── */}
          {(stats.jobsCompleted > 0 || stats.reviewCount > 0) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <SectionHeader title="Your Stats" desc="Updated automatically as you complete jobs." />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{stats.jobsCompleted}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Jobs Done</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-yellow-400">
                    {stats.rating > 0 ? stats.rating.toFixed(1) : "—"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Avg Rating ({stats.reviewCount})</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-indigo-400">{trustScore}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Trust Score</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className={`text-sm font-bold ${
                    trustTier.key === "high" ? "text-green-400" :
                    trustTier.key === "medium" ? "text-blue-400" :
                    trustTier.key === "developing" ? "text-yellow-400" : "text-gray-400"
                  }`}>
                    {trustTier.shortLabel}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Trust Tier</div>
                </div>
              </div>
            </div>
          )}

          {/* Save status */}
          {saveStatus === "error" && (
            <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm flex justify-between">
              <span>{saveError}</span>
              <button type="button" onClick={() => setSaveStatus("idle")} className="ml-4 text-red-400 hover:text-white">✕</button>
            </div>
          )}

          {saveStatus === "saved" && (
            <div className="bg-green-950 border border-green-800 text-green-300 rounded-xl px-4 py-3 text-sm">
              ✓ Profile saved! You'll now appear in job matches for <strong>{form.trade}</strong> jobs in{" "}
              <strong>{form.city || form.zipCode}</strong>.
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 font-semibold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            {saving ? (
              <><span className="animate-spin">⏳</span> Saving…</>
            ) : (
              "Save Profile"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
