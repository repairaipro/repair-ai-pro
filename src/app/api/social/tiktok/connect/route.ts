import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/social/tiktok/connect
 * Initiates TikTok OAuth v2.
 *
 * Env vars required:
 *   TIKTOK_CLIENT_KEY    — from developers.tiktok.com
 *   NEXT_PUBLIC_APP_URL
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

  try {
    const decoded    = await adminAuth.verifyIdToken(token);
    const clientKey  = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/tiktok/callback`;

    if (!clientKey) return NextResponse.json({ error: 'TIKTOK_CLIENT_KEY not configured' }, { status: 503 });

    const state    = Buffer.from(JSON.stringify({ uid: decoded.uid })).toString('base64');
    const csrfState = Math.random().toString(36).slice(2); // anti-CSRF

    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.searchParams.set('client_key',     clientKey);
    url.searchParams.set('response_type',  'code');
    url.searchParams.set('scope',          'user.info.basic,video.publish,video.upload');
    url.searchParams.set('redirect_uri',   redirectUri);
    url.searchParams.set('state',          state);

    return NextResponse.redirect(url.toString());
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
