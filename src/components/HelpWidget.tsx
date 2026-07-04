'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, X, MessageSquare, Mail, FileText } from 'lucide-react';

export default function HelpWidget() {
  const [open, setOpen] = useState(false);

  const links = [
    { icon: <MessageSquare className="w-4 h-4" />, label: 'Contact us', href: '/contact' },
    { icon: <FileText className="w-4 h-4" />, label: 'Terms & Privacy', href: '/terms' },
    { icon: <Mail className="w-4 h-4" />, label: 'Email support', href: 'mailto:support@repairai.pro' },
  ];

  return (
    <>
      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          background: '#4f46e5',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label="Help"
      >
        {open ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
      </button>

      {/* Menu */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 rounded-2xl shadow-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex flex-col gap-0">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.href}
                target={link.href.startsWith('mailto') ? undefined : '_self'}
                className="px-4 py-3 flex items-center gap-3 hover:opacity-70 transition-opacity text-sm"
                style={{
                  color: 'var(--color-text)',
                  borderBottom: i < links.length - 1 ? '1px solid var(--color-border)' : 'none',
                  textDecoration: 'none',
                }}
              >
                <span style={{ color: '#818cf8' }}>{link.icon}</span>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
