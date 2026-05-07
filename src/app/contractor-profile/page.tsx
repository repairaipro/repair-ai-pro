"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getTrustScore, getTrustTier } from "@/lib/matching";
import BusinessImportWidget, { type ImportedBusiness } from "@/components/BusinessImportWidget";
import Link from "next/link";
import { TRADES } from "@/lib/constants";
import { Camera, Save, CheckCircle, AlertTriangle, ChevronLeft, Star, Briefcase, Trophy, TrendingUp, X } from "lucide-react";

type AvailabilityStatus = "available" | "busy" | "offline";

const AVAILABILITY_OPTIONS: { value: AvailabilityStatus; label: string; desc: string; dotColor: string; style: { bg: string; border: string; color: string } }[] = [
  { value: "available", label: "Available", desc: "Actively accepting new jobs", dotColor: '#34d399',
    style: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', color: '#34d399' } },
  { value: "busy",      label: "Busy",      desc: "Taking jobs but may be slow",  dotColor: '#fbbf24',
    style: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',  color: '#fbbf24' } },
  { value: "offline",   label: "Offline",   desc: "Not receiving invitations",    dotColor: '#6b7280',
    style: { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', color: '#9ca3af' } },
];

type ProfileForm = {
  name: string; email: string; phone: string; trade: string; trades: string[];
  city: string; zipCode: string; serviceRadiusMiles: number; bio: string;
  photoUrl: string; hourly: string; experience: string;
  availability: AvailabilityStatus; googlePlaceId: string;
};

const DEFAULT_FORM: ProfileForm = {
  name: "", email: "", phone: "", trade: "", trades: [], city: "", zipCode: "",
  serviceRadiusMiles: 25, bio: "", photoUrl: "", hourly: "", experience: "",
  availability: "available", googlePlaceId: "",
};

const COMPLETENESS_FIELDS = [
  { key: "name",       label: "Name",            critical: true  },
  { key: "trade",      label: "Primary Trade",   critical: true  },
  { key: "city",       label: "City",            critical: true  },
  { key: "zipCode",    label: "ZIP Code",        critical: true  },
  { key: "phone",      label: "Phone",           critical: false },
  { key: "bio",        label: "Bio",             critical: false },
  { key: "photoUrl",   label: "Profile Photo",   critical: false },
  { key: "hourly",     label: "Hourly Rate",     critical: false },
  { key: "experience", label: "Years of Experience", critical: false },
];

function getCompleteness(form: ProfileForm) {
  const filled = COMPLETENESS_FIELDS.filter((f) => {
    const val = form[f.key as keyof ProfileForm];
    if (Array.isArray(val)) return val.length > 0;
    return typeof val === "string" ? val.trim() !== "" : Boolean(val);
  });
  return {
    pct: Math.round((filled.length / COMPLETENESS_FIELDS.length) * 100),
    missing: COMPLETENESS_FIELDS.filter((f) => {
      const val = form[f.key as keyof ProfileForm];
      if (Array.isArray(val)) return val.length === 0;
      return typeof val === "string" ? val.trim() === "" : !val;
    }),
  };
}

async function uploadToCloudinary(file: File, token: string): Promise<string> {
  const signRes = await fetch("/api/cloudinary/sign", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  if (!signRes.ok) throw new Error("Failed to get upload signature");
  const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json();
  const formData = new FormData();
  formData.append("file", file); formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp)); formData.append("signature", signature);
  formData.append("folder", folder);
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
  if (!uploadRes.ok) throw new Error("Cloudinary upload failed");
  return ((await uploadRes.json()).secure_url as string);
}

function SectionCard({ title, desc, children, accentColor }: { title: string; desc?: string; children: React.ReactNode; accentColor?: string }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="mb-1">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
        {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>{hint}</p>}
    </div>
  );
}

export default function ContractorProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, jobsCompleted: 0, invitationAcceptCount: 0, invitationDeclineCount: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "contractors", user.uid));
      if (snap.exists()) {
        const d = snap.data() as any;
        setForm({
          name: d.name ?? user.displayName ?? "", email: d.email ?? user.email ?? "",
          phone: d.phone ?? "", trade: d.trade ?? "",
          trades: Array.isArray(d.trades) ? d.trades : [],
          city: d.city ?? "", zipCode: d.zipCode ?? "",
          serviceRadiusMiles: d.serviceRadiusMiles ?? 25, bio: d.bio ?? "",
          photoUrl: d.photoUrl ?? d.photoURL ?? user.photoURL ?? "",
          hourly: d.hourly != null ? String(d.hourly) : "",
          experience: d.experience != null ? String(d.experience) : "",
          availability: d.availability ?? "available", googlePlaceId: d.googlePlaceId ?? "",
        });
        setStats({
          rating: d.rating ?? 0, reviewCount: d.reviewCount ?? 0,
          jobsCompleted: d.jobsCompleted ?? 0,
          invitationAcceptCount: d.invitationAcceptCount ?? 0,
          invitationDeclineCount: d.invitationDeclineCount ?? 0,
        });
      } else {
        setForm((prev) => ({ ...prev, name: user.displayName ?? "", email: user.email ?? "", photoUrl: user.photoURL ?? "" }));
      }
    })();
  }, [user]);

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }

  function toggleSecondaryTrade(trade: string) {
    setForm((prev) => {
      const has = prev.trades.includes(trade);
      return { ...prev, trades: has ? prev.trades.filter((t) => t !== trade) : [...prev.trades, trade] };
    });
    setSaveStatus("idle");
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoUploading(true);
    try {
      const token = await user.getIdToken();
      set("photoUrl", await uploadToCloudinary(file, token));
    } catch (err: any) {
      alert(err.message ?? "Photo upload failed.");
    } finally {
      setPhotoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleGoogleImport(data: ImportedBusiness) {
    setForm((prev) => ({
      ...prev,
      name: data.name || prev.name, phone: data.phone || prev.phone,
      city: data.city || prev.city, zipCode: data.zipCode || prev.zipCode,
      photoUrl: data.photoUrl || prev.photoUrl,
      trade: data.detectedTrade && (TRADES as readonly string[]).includes(data.detectedTrade) ? data.detectedTrade : prev.trade,
      googlePlaceId: data.placeId,
    }));
    setSaveStatus("idle");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.trade) { setSaveStatus("error"); setSaveError("Please select a primary trade before saving."); return; }
    if (!form.city.trim() && !form.zipCode.trim()) { setSaveStatus("error"); setSaveError("Please enter at least a city or ZIP code."); return; }
    setSaving(true); setSaveStatus("idle");
    try {
      await setDoc(doc(db, "contractors", user.uid), {
        uid: user.uid, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        trade: form.trade, trades: form.trades, city: form.city.trim(), zipCode: form.zipCode.trim(),
        serviceRadiusMiles: form.serviceRadiusMiles, bio: form.bio.trim(), photoUrl: form.photoUrl,
        hourly: form.hourly ? Number(form.hourly) : null,
        experience: form.experience ? Number(form.experience) : null,
        availability: form.availability, googlePlaceId: form.googlePlaceId || null,
        updatedAt: serverTimestamp(), lastActiveAt: serverTimestamp(),
      }, { merge: true });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      setSaveStatus("error");
      setSaveError(err?.message ?? "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="card p-8 text-center max-w-sm w-full">
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-3)' }}>Sign in to manage your contractor profile.</p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">Sign In</Link>
        </div>
      </div>
    );
  }

  const { pct, missing } = getCompleteness(form);
  const trustScore = getTrustScore({ rating: stats.rating, reviewCount: stats.reviewCount, jobsCompleted: stats.jobsCompleted, invitationAcceptCount: stats.invitationAcceptCount, invitationDeclineCount: stats.invitationDeclineCount });
  const trustTier = getTrustTier(trustScore);
  const pctColor = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
  const pctBarColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Contractor Profile</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>Your profile controls which jobs you get matched to.</p>
          </div>
          <Link href="/contractor-inbox" className="btn btn-secondary btn-sm">
            <ChevronLeft className="w-3.5 h-3.5" /> My Inbox
          </Link>
        </div>

        {/* Completeness Bar */}
        <div className="card p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>Profile Completeness</span>
            <span className="text-sm font-bold" style={{ color: pctColor }}>{pct}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pctBarColor }} />
          </div>
          {missing.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {missing.map((f) => (
                <span key={f.key} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={f.critical
                    ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }
                    : { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-4)' }
                  }>
                  {f.critical && "⚠ "}{f.label}
                </span>
              ))}
            </div>
          )}
          {pct < 60 && (
            <p className="text-xs" style={{ color: '#fbbf24' }}>
              Complete the red fields above — they're required for the matching system to find you jobs.
            </p>
          )}
        </div>

        <form onSubmit={saveProfile} className="space-y-5">

          {/* Google Import */}
          <div className="card p-5" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span className="text-sm">🔍</span>
              </div>
              <h2 className="text-sm font-semibold" style={{ color: '#a5b4fc' }}>Import from Google</h2>
              {form.googlePlaceId && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
                  ✓ Linked to Google
                </span>
              )}
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-4)' }}>
              Search for your business on Google to auto-fill your profile.
            </p>
            <BusinessImportWidget onImport={handleGoogleImport} />
          </div>

          {/* Availability */}
          <SectionCard title="Availability Status" desc="This is the most important field. Offline contractors receive zero job invitations.">
            <div className="grid grid-cols-3 gap-3">
              {AVAILABILITY_OPTIONS.map((opt) => {
                const isActive = form.availability === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("availability", opt.value)}
                    className="p-3.5 rounded-xl text-center transition-all duration-200"
                    style={{
                      border: isActive ? `2px solid ${opt.style.border}` : '1px solid var(--color-border)',
                      background: isActive ? opt.style.bg : 'var(--color-surface-2)',
                      boxShadow: isActive ? `0 0 12px ${opt.style.bg}` : 'none',
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full mx-auto mb-2" style={{ background: opt.dotColor }} />
                    <div className="text-xs font-semibold" style={{ color: isActive ? opt.style.color : 'var(--color-text-2)' }}>{opt.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
            {form.availability === "offline" && (
              <div className="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                You are offline. You will not appear in job matches or receive any invitations until you switch to Available or Busy.
              </div>
            )}
          </SectionCard>

          {/* Basic Info */}
          <SectionCard title="Basic Info">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover"
                    style={{ border: '2px solid var(--color-border)' }} />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))', border: '2px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                    {(form.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                {photoUploading && (
                  <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={photoUploading}
                  className="btn btn-secondary btn-sm">
                  <Camera className="w-3.5 h-3.5" />
                  {photoUploading ? "Uploading…" : "Upload Photo"}
                </button>
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-4)' }}>JPG or PNG. Shown on your public profile.</p>
              </div>
            </div>

            <Field label="Full Name / Business Name">
              <input value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. John's Plumbing Services" className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  placeholder="(555) 555-5555" type="tel" className="input" />
              </Field>
              <Field label="Email">
                <input value={form.email} onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com" type="email" className="input" />
              </Field>
            </div>
          </SectionCard>

          {/* Trade */}
          <SectionCard title="Trade & Specialties" desc="Your primary trade must match the job trade exactly for you to be invited.">
            <Field label="Primary Trade" hint="This is the main filter — only jobs in this trade will match you.">
              <select value={form.trade} onChange={(e) => set("trade", e.target.value)} className="input">
                <option value="">— Select your trade —</option>
                {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Additional Trades" hint="Check any other trades you also handle. You'll be matched for those jobs too.">
              <div className="flex flex-wrap gap-2 mt-1">
                {TRADES.filter((t) => t !== form.trade).map((t) => {
                  const active = form.trades.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleSecondaryTrade(t)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                      style={{
                        background: active ? 'rgba(99,102,241,0.12)' : 'var(--color-surface-2)',
                        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
                        color: active ? '#a5b4fc' : 'var(--color-text-4)',
                      }}
                    >
                      {active ? "✓ " : ""}{t}
                    </button>
                  );
                })}
              </div>
            </Field>
          </SectionCard>

          {/* Service Area */}
          <SectionCard title="Service Area" desc="We use your city and ZIP code to match you with nearby jobs. Fill in both for the best results.">
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" hint="Must match the city homeowners enter.">
                <input value={form.city} onChange={(e) => set("city", e.target.value)}
                  placeholder="e.g. Houston" className="input" />
              </Field>
              <Field label="ZIP Code">
                <input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)}
                  placeholder="e.g. 77001" maxLength={10} className="input" />
              </Field>
            </div>

            <Field label={`Service Radius: ${form.serviceRadiusMiles} miles`} hint="How far you're willing to travel from your ZIP code.">
              <input type="range" min={5} max={75} step={5} value={form.serviceRadiusMiles}
                onChange={(e) => set("serviceRadiusMiles", Number(e.target.value))}
                className="w-full accent-indigo-500 mt-1" />
              <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
                <span>5 mi</span><span>75 mi</span>
              </div>
            </Field>
          </SectionCard>

          {/* About & Rates */}
          <SectionCard title="About You & Rates">
            <Field label="Bio" hint="Tell homeowners what makes you great. 2–4 sentences works well.">
              <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)}
                placeholder="e.g. Licensed plumber with 12 years of experience serving the Houston area. Specialize in leak repair, remodels, and water heater installation. I offer free estimates and always clean up after myself."
                rows={4} className="input resize-none" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Hourly Rate (USD)" hint="Shown as 'From $X/hr' on your listing.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-text-4)' }}>$</span>
                  <input value={form.hourly} onChange={(e) => set("hourly", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="85" inputMode="numeric" className="input pl-7" />
                </div>
              </Field>
              <Field label="Years of Experience">
                <input value={form.experience} onChange={(e) => set("experience", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 8" inputMode="numeric" className="input" />
              </Field>
            </div>
          </SectionCard>

          {/* Stats (read-only) */}
          {(stats.jobsCompleted > 0 || stats.reviewCount > 0) && (
            <SectionCard title="Your Stats" desc="Updated automatically as you complete jobs.">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: stats.jobsCompleted, label: "Jobs Done",  color: 'var(--color-text)', icon: <Briefcase className="w-4 h-4" /> },
                  { value: stats.rating > 0 ? stats.rating.toFixed(1) : "—", label: `Rating (${stats.reviewCount})`, color: '#fbbf24', icon: <Star className="w-4 h-4" /> },
                  { value: trustScore, label: "Trust Score", color: '#818cf8', icon: <TrendingUp className="w-4 h-4" /> },
                  { value: trustTier.shortLabel, label: "Trust Tier",  color: trustTier.key === "high" ? '#34d399' : trustTier.key === "medium" ? '#60a5fa' : trustTier.key === "developing" ? '#fbbf24' : '#9ca3af', icon: <Trophy className="w-4 h-4" /> },
                ].map(({ value, label, color, icon }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
                    <div className="text-xl font-bold" style={{ color }}>{String(value)}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Save status messages */}
          {saveStatus === "error" && (
            <div className="rounded-xl px-4 py-3 text-sm flex justify-between items-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <span>{saveError}</span>
              <button type="button" onClick={() => setSaveStatus("idle")}><X className="w-4 h-4" /></button>
            </div>
          )}

          {saveStatus === "saved" && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Profile saved! You'll now appear in <strong>{form.trade}</strong> jobs near <strong>{form.city || form.zipCode}</strong>.
            </div>
          )}

          <button type="submit" disabled={saving} className="btn btn-primary btn-full btn-lg">
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity=".25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              <><Save className="w-4 h-4" /> Save Profile</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
