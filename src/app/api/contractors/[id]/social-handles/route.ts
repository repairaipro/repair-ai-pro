import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

/** GET — returns public social handles for a contractor */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const snap = await adminDb.collection('contractors').doc(params.id).get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ handles: snap.data()?.socialHandles ?? {} });
}

/** POST — contractor saves their own social handles */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  if (decoded.uid !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Sanitize — only allow known handle keys, strip leading @ for username fields
  const clean: Record<string, string> = {};
  const strip = (v: unknown) => typeof v === 'string' ? v.trim().replace(/^@/, '').slice(0, 100) : '';
  const url   = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, 200) : '';

  if (body.instagram !== undefined)  clean.instagram  = strip(body.instagram);
  if (body.tiktok    !== undefined)  clean.tiktok     = strip(body.tiktok);
  if (body.facebook  !== undefined)  clean.facebook   = url(body.facebook);
  if (body.youtube   !== undefined)  clean.youtube    = url(body.youtube);
  if (body.website   !== undefined)  clean.website    = url(body.website);

  await adminDb.collection('contractors').doc(params.id).set(
    { socialHandles: clean },
    { merge: true }
  );

  return NextResponse.json({ success: true, handles: clean });
}
