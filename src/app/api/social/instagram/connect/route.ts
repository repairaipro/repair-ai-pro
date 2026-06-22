import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/social/instagram/connect
 * Initiates Instagram OAuth. Redirects to Meta's auth dialog.
 *
 * Env vars required:
 *   META_APP_ID          — from developers.facebook.com
 *   NEXT_PUBLIC_APP_URL  — e.g. https://repairai.pro
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

  try {
    await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const appId       = process.env.META_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/callback`;

  if (!appId) {
    return NextResponse.json({ error: 'META_APP_ID not configured' }, { status: 503 });
  }

  // Pass UID through state so callback knows who to save the token for
  const decoded = await adminAuth.verifyIdToken(token);
  const state = Buffer.from(JSON.stringify({ uid: decoded.uid })).toString('base64');

  const url = new URL('https://api.instagram.com/oauth/authorize');
  url.searchParams.set('client_id',      appId);
  url.searchParams.set('redirect_uri',   redirectUri);
  url.searchParams.set('scope',          'instagram_basic,instagram_content_publish,pages_read_engagement');
  url.searchParams.set('response_type',  'code');
  url.searchParams.set('state',          state);

  return NextResponse.redirect(url.toString());
}
