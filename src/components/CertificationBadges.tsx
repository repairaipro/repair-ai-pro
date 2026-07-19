'use client';

import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export interface Certification {
  id?: string;
  type: 'license' | 'insurance' | 'certification' | 'training';
  name: string;
  issuer?: string;
  expirationDate?: Date | string;
  verified?: boolean;
  certificateUrl?: string;
}

interface CertificationBadgesProps {
  certifications: Certification[];
  showDetails?: boolean;
  onViewCertificate?: (url: string) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'license':
      return '📋';
    case 'insurance':
      return '🛡️';
    case 'certification':
      return '⭐';
    case 'training':
      return '📚';
    default:
      return '✓';
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    license: 'License',
    insurance: 'Insurance',
    certification: 'Certification',
    training: 'Training',
  };
  return labels[type] || type;
};

const isExpired = (date?: Date | string) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

export function CertificationBadges({
  certifications,
  onViewCertificate,
}: CertificationBadgesProps) {
  if (certifications.length === 0) {
    return (
      <div className="rounded-lg p-4 text-center" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>No certifications added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {certifications.map((cert, idx) => {
        const expired = isExpired(cert.expirationDate);

        return (
          <div
            key={cert.id || idx}
            className="flex items-start gap-3 rounded-lg p-3"
            style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
          >
            <div className="mt-0.5 text-xl">{getIcon(cert.type)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>{cert.name}</p>
                {cert.verified && (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#34d399' }} />
                )}
                {expired && (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#f87171' }} />
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-3)' }}
                >
                  {getTypeLabel(cert.type)}
                </span>

                {cert.issuer && (
                  <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>{cert.issuer}</span>
                )}

                {cert.expirationDate && (
                  <span
                    className="text-xs"
                    style={expired ? { color: '#f87171', fontWeight: 500 } : { color: 'var(--color-text-4)' }}
                  >
                    {expired ? 'Expired: ' : 'Expires: '}
                    {new Date(cert.expirationDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {cert.certificateUrl && (
              <button
                onClick={() => onViewCertificate?.(cert.certificateUrl!)}
                className="flex-shrink-0 transition-opacity hover:opacity-70"
                style={{ color: '#818cf8' }}
                title="View certificate"
              >
                <FileText className="h-5 w-5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
