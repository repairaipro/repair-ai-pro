import Link from 'next/link';

const YEAR = new Date().getFullYear();

const NAV = [
  {
    heading: 'Product',
    links: [
      { label: 'Free AI Diagnosis', href: '/diagnose' },
      { label: 'Browse Contractors', href: '/contractor' },
      { label: 'Post a Job', href: '/jobs/new' },
      { label: 'Financing', href: '/financing' },
      { label: 'RepairAI Guarantee', href: '/guarantee' },
    ],
  },
  {
    heading: 'For Contractors',
    links: [
      { label: 'Join as a Pro', href: '/auth/signin?redirect=%2Fonboarding%2Fcontractor' },
      { label: 'Pro Plans', href: '/contractor/pro' },
      { label: 'Studio Dashboard', href: '/studio' },
      { label: 'My Schedule', href: '/contractor/schedule' },
      { label: 'Work Feed', href: '/work' },
      { label: 'Contractor Wrapped', href: '/studio/wrapped' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Unsubscribe', href: '/unsubscribe' },
    ],
  },
];

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3" style={{ textDecoration: 'none' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <span style={{ color: '#fff', fontSize: 14 }}>⚡</span>
              </div>
              <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                Repair<span style={{ color: '#818cf8' }}>AI</span> Pro
              </span>
            </Link>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--color-text-4)' }}>
              AI-powered home repair marketplace for Houston, TX. Get a fair price, a verified pro, and payment protection — all in one place.
            </p>
            {/* Social icons removed: they pointed at instagram.com/repairai etc. —
                handles this business doesn't own. Restore only with real accounts. */}
          </div>

          {/* Nav columns */}
          {NAV.map(col => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-3)' }}>
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-xs transition-colors hover:opacity-80"
                      style={{ color: 'var(--color-text-4)', textDecoration: 'none' }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            © {YEAR} RepairAI Pro. All rights reserved. Houston, TX.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-4)' }}>
            <span>🔒 Payments secured by Stripe</span>
            <span>🛡 RepairAI Guarantee</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
