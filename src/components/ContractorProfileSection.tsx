'use client';

import { ReactNode } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';

interface ContractorProfileSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  helpText?: string;
}

export function ContractorProfileSection({
  title,
  description,
  children,
  icon,
  defaultOpen = true,
  helpText,
}: ContractorProfileSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          {icon && <div className="text-xl">{icon}</div>}
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-600">{description}</p>}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          {helpText && (
            <div className="mb-4 flex gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{helpText}</p>
            </div>
          )}
          <div>{children}</div>
        </div>
      )}
    </div>
  );
}
