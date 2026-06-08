'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Upload, FileText, CheckCircle, Clock,
  AlertTriangle, XCircle, ChevronDown, ChevronUp, Loader2, X,
} from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';

type VerificationState = {
  status: VerificationStatus;
  licenseVerified: boolean;
  insuranceVerified: boolean;
  verifiedAt: string | null;
  insuranceExpiresAt: string | null;
  docs: {
    licenseDocUrl?: string;
    insuranceDocUrl?: string;
    licenseNumber?: string;
    licenseState?: string;
    licenseType?: string;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    coverageAmountUsd?: number;
    insuranceExpiry?: string;
    submittedAt?: string;
    rejectionReason?: string;
  } | null;
};

type Props = {
  authToken: string;
};

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = 'repair_ai_photos';

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const toBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const base64 = await toBase64(file);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: base64,
      upload_preset: UPLOAD_PRESET,
      folder,
      resource_type: 'auto',
    }),
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

export default function InsuranceVerificationUpload({ authToken }: Props) {
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [coverageAmount, setCoverageAmount] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');

  useEffect(() => {
    fetchStatus();
  }, [authToken]);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/contractor/verification', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) setVerification(data);
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!licenseFile && !insuranceFile) {
      setError('Please upload at least one document.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      let licenseDocUrl: string | undefined;
      let insuranceDocUrl: string | undefined;

      if (licenseFile) {
        licenseDocUrl = await uploadToCloudinary(licenseFile, 'repair-ai/contractor-docs/licenses');
      }
      if (insuranceFile) {
        insuranceDocUrl = await uploadToCloudinary(insuranceFile, 'repair-ai/contractor-docs/insurance');
      }

      const res = await fetch('/api/contractor/verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseDocUrl,
          insuranceDocUrl,
          licenseNumber: licenseNumber || undefined,
          licenseState: licenseState || undefined,
          licenseType: licenseType || undefined,
          insuranceProvider: insuranceProvider || undefined,
          insurancePolicyNumber: policyNumber || undefined,
          coverageAmountUsd: coverageAmount ? parseFloat(coverageAmount) : undefined,
          insuranceExpiry: insuranceExpiry || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Documents submitted! Our team will review within 1–2 business days.');
      await fetchStatus();
      setExpanded(false);
    } catch (e: any) {
      setError(e.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  const status = verification?.status || 'unverified';
  const isVerified = status === 'verified';
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const canSubmit = status === 'unverified' || status === 'rejected' || status === 'expired';

  return (
    <div style={{
      background: isVerified
        ? 'rgba(16,185,129,0.05)'
        : isPending
        ? 'rgba(245,158,11,0.05)'
        : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isVerified ? 'rgba(16,185,129,0.2)' : isPending ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 18,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: isVerified ? 'rgba(16,185,129,0.15)' : isPending ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={20} color={isVerified ? '#34d399' : isPending ? '#fcd34d' : '#818cf8'} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#e5e7eb' }}>
              License & Insurance Verification
            </span>
            <VerifiedBadge status={status} licenseVerified={verification?.licenseVerified} insuranceVerified={verification?.insuranceVerified} size="sm" />
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', lineHeight: 1.4 }}>
            {isVerified
              ? `Verified${verification?.verifiedAt ? ` on ${new Date(verification.verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}. Your Verified Pro badge shows on your profile.`
              : isPending
              ? 'Documents submitted — under review (1–2 business days).'
              : isRejected
              ? `Rejected: ${verification?.docs?.rejectionReason || 'Please resubmit valid documents.'}`
              : 'Upload your contractor license and/or insurance certificate to earn the Verified Pro badge.'}
          </p>
        </div>

        {canSubmit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#818cf8' }}>
              {expanded ? 'Close' : 'Upload Docs'}
            </span>
            {expanded ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
          </div>
        )}
      </button>

      {/* Verified state — show what's verified */}
      {isVerified && (
        <div style={{ padding: '0 20px 18px', display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={15} color="#34d399" />
            <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>License Verified</span>
          </div>
          <div style={{ flex: 1, padding: '10px 14px', background: verification?.insuranceVerified ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            {verification?.insuranceVerified
              ? <CheckCircle size={15} color="#34d399" />
              : <Clock size={15} color="#fcd34d" />}
            <span style={{ fontSize: 13, color: verification?.insuranceVerified ? '#34d399' : '#fcd34d', fontWeight: 600 }}>
              {verification?.insuranceVerified ? 'Insurance Verified' : 'Insurance Pending'}
            </span>
          </div>
        </div>
      )}

      {/* Upload form */}
      <AnimatePresence>
        {canSubmit && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <form onSubmit={handleSubmit} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '20px' }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#f87171', fontSize: 13, marginBottom: 16 }}>
                  <AlertTriangle size={14} /> {error}
                  <button type="button" onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><X size={14} /></button>
                </div>
              )}
              {success && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, color: '#34d399', fontSize: 13, marginBottom: 16 }}>
                  <CheckCircle size={14} /> {success}
                </div>
              )}

              {/* License section */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} color="#818cf8" /> Contractor License
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="License number"
                    style={inputStyle}
                  />
                  <input
                    value={licenseState}
                    onChange={(e) => setLicenseState(e.target.value)}
                    placeholder="State (e.g. CA)"
                    maxLength={2}
                    style={inputStyle}
                  />
                </div>
                <input
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  placeholder="License type (e.g. General Contractor, Electrician)"
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 10 }}
                />
                <FileDropZone
                  label="License certificate (PDF or image)"
                  file={licenseFile}
                  onFile={setLicenseFile}
                  accept="image/*,.pdf"
                />
              </div>

              {/* Insurance section */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} color="#818cf8" /> General Liability Insurance
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    placeholder="Insurance provider"
                    style={inputStyle}
                  />
                  <input
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="Policy number"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <input
                    value={coverageAmount}
                    onChange={(e) => setCoverageAmount(e.target.value)}
                    placeholder="Coverage amount (e.g. 1000000)"
                    type="number"
                    style={inputStyle}
                  />
                  <input
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    placeholder="Expiry (YYYY-MM)"
                    pattern="\d{4}-\d{2}"
                    style={inputStyle}
                  />
                </div>
                <FileDropZone
                  label="Certificate of Insurance (PDF or image)"
                  file={insuranceFile}
                  onFile={setInsuranceFile}
                  accept="image/*,.pdf"
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Submit for Verification</>}
                </button>
              </div>

              <p style={{ fontSize: 11, color: '#4b5563', margin: '12px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
                Documents are securely stored and only viewed by our verification team. Review takes 1–2 business days.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#e5e7eb',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

function FileDropZone({
  label, file, onFile, accept,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
  accept: string;
}) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        background: file ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px dashed ${file ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 10, cursor: 'pointer',
      }}
    >
      <input
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {file
        ? <CheckCircle size={16} color="#34d399" />
        : <Upload size={16} color="#6b7280" />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: file ? '#34d399' : '#9ca3af' }}>
          {file ? file.name : label}
        </div>
        {file && <div style={{ fontSize: 11, color: '#6b7280' }}>{(file.size / 1024).toFixed(0)} KB — click to change</div>}
      </div>
    </label>
  );
}
