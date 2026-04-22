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

export const metadata: Metadata = {
  title: 'Repair AI Pro',
  description: 'AI-assisted service marketplace platform',
  manifest: '/manifest.json',
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
      <body className="bg-gray-950 text-white min-h-screen">
        {/* ✅ Provide global authentication context */}
        <AuthProvider>
          <Header />
          <main className="p-6">{children}</main>
          {/* ✅ PWA: Register service worker, update badge, listen for install prompt */}
          <PWASetup />
        </AuthProvider>
      </body>
    </html>
  );
}
