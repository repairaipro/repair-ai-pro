import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/social/tiktok/callback
 * Handles TikTok OAuth v2 callback. Exchanges code for access + refresh tokens.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error) return NextResponse.redirect(`${appUrl}/studio?social=tiktok&status=denied`);
  if (!code || !state) return NextResponse.redirect(`${appUrl}/studio?social=tiktok&status=error`);

  let uid: string;
  try {
    uid = JSON.parse(Buffer.from(state, 'base64').toString()).uid;
  } catch {
    return NextResponse.redirect(`${appUrl}/studio?social=tiktok&status=error`);
  }

  const clientKey    = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
  const redirectUri  = `${appUrl}/api/social/tiktok/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key:    clientKey,
        client_secret: clientSecret,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('No access token');

    // Fetch user info
    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,username,avatar_url', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    const user = userData.data?.user ?? {};

    await adminDb.collection('contractors').doc(uid).set({
      socialConnections: {
        tiktok: {
          connected:    true,
          accessToken:  tokenData.access_token,
          refreshToken: tokenData.refresh_token ?? null,
          openId:       tokenData.open_id,
          username:     user.username ?? user.display_name ?? null,
          connectedAt:  new Date().toISOString(),
          expiresAt:    tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
        },
      },
      socialHandles: { tiktok: user.username ?? user.display_name ?? null },
    }, { merge: true });

    const username = user.username ?? user.display_name ?? '';
    return NextResponse.redirect(`${appUrl}/studio?social=tiktok&status=connected&username=${username}`);
  } catch (err) {
    console.error('TikTok callback error:', err);
    return NextResponse.redirect(`${appUrl}/studio?social=tiktok&status=error`);
  }
}
