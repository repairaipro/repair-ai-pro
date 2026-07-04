import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { sendContactFormConfirmation } from '@/lib/emailService';

export async function POST(req: Request) {
  const rl = rateLimit(req, 'contact', 3, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const { name, email, subject, message } = await req.json();
  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await adminDb.collection('contactSubmissions').add({
    name, email,
    subject: subject || 'General question',
    message,
    createdAt: FieldValue.serverTimestamp(),
    status: 'new',
  });

  // Send confirmation email to user (fire-and-forget)
  void sendContactFormConfirmation(name, email);

  // Send notification to support team (fire-and-forget)
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'noreply@repairai.pro',
      to: 'support@repairai.pro',
      subject: `Contact form: ${subject || 'General question'} — ${name}`,
      html: `
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true });
}
