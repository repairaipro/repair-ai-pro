'use client';

import { Badge } from './ui/Badge';
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
  showDetails = false,
  onViewCertificate,
}: CertificationBadgesProps) {
  if (certifications.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">No certifications added yet</p>
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
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3"
          >
            <div className="mt-0.5 text-xl">{getIcon(cert.type)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{cert.name}</p>
                {cert.verified && (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                )}
                {expired && (
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="neutral" className="text-xs">
                  {getTypeLabel(cert.type)}
                </Badge>

                {cert.issuer && (
                  <span className="text-xs text-gray-600">{cert.issuer}</span>
                )}

                {cert.expirationDate && (
                  <span
                    className={`text-xs ${
                      expired ? 'text-red-600 font-medium' : 'text-gray-600'
                    }`}
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
                className="flex-shrink-0 text-blue-600 hover:text-blue-700"
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
