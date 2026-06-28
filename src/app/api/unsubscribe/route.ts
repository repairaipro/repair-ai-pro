import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const rl = rateLimit(req, 'unsubscribe', 5, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const { email, type } = await req.json();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  // Find user by email and update preferences
  const usersSnap = await adminDb.collection('users').where('email', '==', email).limit(1).get();
  const contractorsSnap = await adminDb.collection('contractors').where('email', '==', email).limit(1).get();

  const prefs = {
    emailMarketing:   type === 'all' || type === 'marketing' ? false : undefined,
    emailDigest:      type === 'all' || type === 'digest'    ? false : undefined,
    emailUnsubscribeAll: type === 'all' ? true : undefined,
    unsubscribedAt:   FieldValue.serverTimestamp(),
  };
  // Remove undefined keys
  const cleanPrefs = Object.fromEntries(Object.entries(prefs).filter(([, v]) => v !== undefined));

  const updates: Promise<any>[] = [];
  usersSnap.forEach(d => updates.push(d.ref.set({ emailPreferences: cleanPrefs }, { merge: true })));
  contractorsSnap.forEach(d => updates.push(d.ref.set({ emailPreferences: cleanPrefs }, { merge: true })));

  // Always log the unsubscribe request regardless of account status
  updates.push(adminDb.collection('unsubscribes').add({ email, type: type ?? 'all', createdAt: FieldValue.serverTimestamp() }));

  await Promise.all(updates);
  return NextResponse.json({ success: true });
}
