import './globals.css';
import type { Metadata, Viewport } from 'next';
import React from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from '@/lib/auth'; // global auth context

// ✅ Load Header client-side only (prevents hydration issues)
const Header = dynamic(() => import('@/components/Header.client'), {
  ssr: false,
});

// ✅ PWA setup client component
const PWASetup = dynamic(() => import('@/components/PWASetup'), {
  ssr: false,
});

// ✅ Mobile bottom navigation
const MobileBottomNav = dynamic(() => import('@/components/MobileBottomNav'), {
  ssr: false,
});

// ✅ Toast notification system
import { ToastProvider } from '@/components/ToastProvider';
import Footer from '@/components/Footer';

// ✅ Background notification → toast watcher
const NotificationToastWatcher = dynamic(() => import('@/components/NotificationToastWatcher'), {
  ssr: false,
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://repairaipro.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'RepairAI Pro — AI-Powered Home Repair Marketplace',
    template: '%s · RepairAI Pro',
  },
  description:
    'Snap a photo, get an AI diagnosis and a data-driven price estimate, then match with verified local contractors. Milestone payments, live progress tracking, and photo-verified work.',
  keywords: [
    'home repair', 'contractor marketplace', 'AI diagnosis', 'plumber',
    'electrician', 'HVAC', 'handyman', 'repair estimate', 'verified contractors',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'RepairAI Pro',
    title: 'RepairAI Pro — AI-Powered Home Repair Marketplace',
    description:
      'AI diagnoses your repair from a photo, estimates cost from real local job data, and matches you with quality-scored contractors.',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RepairAI Pro — AI-Powered Home Repair Marketplace',
    description:
      'AI diagnoses your repair from a photo, estimates cost from real local job data, and matches you with quality-scored contractors.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Repair AI Pro',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Theme color for browser chrome */}
        <meta name="theme-color" content="#4f46e5" />
        {/* Apple-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Repair AI Pro" />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        {/* ✅ Provide global authentication context */}
        <AuthProvider>
          <ToastProvider>
            <NotificationToastWatcher />
            <Header />
            <main className="p-6 flex-1">{children}</main>
            <Footer />
            {/* ✅ PWA: Register service worker, update badge, listen for install prompt */}
            <PWASetup />
            {/* ✅ Mobile sticky bottom navigation */}
            <MobileBottomNav />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
