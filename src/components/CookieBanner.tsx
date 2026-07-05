'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
    // Load analytics if available
    if ((window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    // Slim bar, no dark page overlay — a cookie notice shouldn't dim the hero
    // CTA on first visit. Full width on mobile, floating card on desktop.
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 pointer-events-none">
      <div className="max-w-2xl mx-auto rounded-2xl px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-auto"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>

        <div className="flex-1">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-3)' }}>
            <strong style={{ color: 'var(--color-text)' }}>We use cookies</strong> — essential ones for sign-in, optional analytics to improve the app.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleDecline} className="btn btn-outline btn-sm">
            Decline
          </button>
          <button onClick={handleAccept} className="btn btn-primary btn-sm">
            Accept
          </button>
          <button onClick={() => setShow(false)} className="p-2 rounded-lg hover:opacity-70 transition-opacity"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-4)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
