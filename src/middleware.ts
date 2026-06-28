import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware — lightweight route guards.
 *
 * Firebase auth tokens live in client storage (IndexedDB), not cookies,
 * so we can't do full server-side auth at the edge without session cookies.
 * This middleware handles:
 *   1. Admin routes → redirect to /auth/signin if no session hint cookie
 *   2. Sets security headers on all responses
 *   3. Redirects legacy /chat?job= URLs to /jobs/[jobId]
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const res = NextResponse.next();

  // ── Security headers ──────────────────────────────────────────────────
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  // ── Legacy URL redirect: /chat?job=ID → /jobs/ID ─────────────────────
  if (pathname === '/chat') {
    const jobId = searchParams.get('job');
    if (jobId) {
      return NextResponse.redirect(new URL(`/jobs/${jobId}`, req.url));
    }
  }

  // ── Admin route protection ────────────────────────────────────────────
  // We can't verify Firebase tokens at the edge without session cookies.
  // The admin pages do their own auth check client-side, but we add a
  // basic layer: if the user doesn't have our "auth hint" cookie at all,
  // redirect them. This prevents accidental 404s from direct navigation.
  // Real auth enforcement happens in the page components.
  if (pathname.startsWith('/admin')) {
    const hasAuthHint = req.cookies.has('_auth_hint');
    if (!hasAuthHint) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and API
    '/((?!_next/static|_next/image|favicon|manifest|sw\\.js|.*\\.png|.*\\.ico|.*\\.svg).*)',
  ],
};
