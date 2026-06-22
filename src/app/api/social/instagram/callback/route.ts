import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/social/instagram/callback
 * Handles Meta OAuth callback. Exchanges code for long-lived token,
 * saves to Firestore (server-side only — never exposed to client).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error) {
    return NextResponse.redirect(`${appUrl}/studio?social=instagram&status=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/studio?social=instagram&status=error`);
  }

  let uid: string;
  try {
    uid = JSON.parse(Buffer.from(state, 'base64').toString()).uid;
  } catch {
    return NextResponse.redirect(`${appUrl}/studio?social=instagram&status=error`);
  }

  const appId     = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `${appUrl}/api/social/instagram/callback`;

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     appId,
        client_secret: appSecret,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('No access token');

    const shortToken = tokenData.access_token;
    const igUserId   = tokenData.user_id;

    // Exchange for long-lived token (60-day)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
    );
    const longData = await longRes.json();
    const longToken = longData.access_token ?? shortToken;

    // Fetch Instagram username
    const meRes = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${longToken}`);
    const me    = await meRes.json();

    // Save token server-side only (never in publicContractor)
    await adminDb.collection('contractors').doc(uid).set({
      socialConnections: {
        instagram: {
          connected:   true,
          accessToken: longToken,
          userId:      String(igUserId),
          username:    me.username ?? null,
          connectedAt: new Date().toISOString(),
        },
      },
      socialHandles: { instagram: me.username ?? null },
    }, { merge: true });

    return NextResponse.redirect(`${appUrl}/studio?social=instagram&status=connected&username=${me.username ?? ''}`);
  } catch (err) {
    console.error('Instagram callback error:', err);
    return NextResponse.redirect(`${appUrl}/studio?social=instagram&status=error`);
  }
}
