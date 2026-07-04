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
    if (window.gtag) {
      window.gtag('consent', 'update', {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="max-w-2xl mx-auto rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--color-text)' }}>
            We use cookies
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            We use essential cookies for authentication and session management. Optional analytics cookies help us improve the platform. You can control these preferences anytime.
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
