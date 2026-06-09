'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/db';
import { LayoutDashboard, Briefcase, Plus, Inbox, Clock } from 'lucide-react';

/**
 * Sticky bottom navigation bar for mobile — only shown on small screens.
 * Renders when user is authenticated.
 */
export default function MobileBottomNav() {
  const { user } = useAuth();
  const pathname  = usePathname();
  const [pendingInvites, setPendingInvites] = useState(0);

  /* Watch contractor inbox for pending invitations */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'contractors', user.uid, 'jobInbox'),
      where('invitationStatus', '==', 'pending')
    );
    return onSnapshot(q, (snap) => setPendingInvites(snap.size), () => {});
  }, [user]);


  if (!user) return null;

  // Hide on auth pages
  if (pathname?.startsWith('/auth')) return null;

  const tabs = [
    {
      href:   '/dashboard',
      label:  'Home',
      icon:   LayoutDashboard,
      active: pathname === '/dashboard' || pathname?.startsWith('/dashboard'),
    },
    {
      href:   '/jobs',
      label:  'Jobs',
      icon:   Briefcase,
      active: pathname?.startsWith('/jobs') && pathname !== '/jobs/new',
    },
    {
      href:   '/jobs/new',
      label:  'Post',
      icon:   Plus,
      active: pathname === '/jobs/new',
      cta:    true,
    },
    {
      href:   '/contractor-inbox',
      label:  'Inbox',
      icon:   Inbox,
      active: pathname?.startsWith('/contractor-inbox'),
      badge:  pendingInvites,
    },
    {
      href:   '/history',
      label:  'History',
      icon:   Clock,
      active: pathname?.startsWith('/history'),
    },
  ];

  return (
    <>
      {/* Spacer so content isn't hidden behind the nav */}
      <div className="md:hidden" style={{ height: 64 }} />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(10,11,17,0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--color-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: 56 }}>
          {tabs.map(({ href, label, icon: Icon, active, cta, badge }) => (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                textDecoration: 'none',
                position: 'relative',
                height: '100%',
                ...(cta ? {
                  flex: '0 0 64px',
                } : {}),
              }}
            >
              {cta ? (
                /* Floating action button */
                <div style={{
                  width: 48, height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
                  marginBottom: 4,
                }}>
                  <Icon size={22} color="#fff" />
                </div>
              ) : (
                <>
                  {/* Badge */}
                  {badge != null && badge > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: 8, right: '50%', transform: 'translateX(14px)',
                      background: '#ef4444', color: '#fff',
                      fontSize: 9, fontWeight: 800,
                      minWidth: 16, height: 16, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                      border: '1.5px solid rgba(10,11,17,0.95)',
                    }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}

                  <Icon
                    size={22}
                    style={{
                      color: active ? 'var(--color-brand)' : 'var(--color-text-4)',
                      transition: 'color 0.15s',
                    }}
                  />
                  <span style={{
                    fontSize: 10,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--color-brand)' : 'var(--color-text-4)',
                    transition: 'color 0.15s',
                  }}>
                    {label}
                  </span>

                  {/* Active indicator dot */}
                  {active && (
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      width: 4, height: 4,
                      borderRadius: '50%',
                      background: 'var(--color-brand)',
                    }} />
                  )}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
