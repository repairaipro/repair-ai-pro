import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

/**
 * POST /api/financing/apply
 *
 * Handles financing pre-qualification requests.
 *
 * With WISETACK_MERCHANT_ID set:
 *   Returns a Wisetack application URL — frontend redirects the user there.
 *   Wisetack handles credit check, approval, and funds disbursement.
 *
 * Without the key (or any other lender):
 *   Saves the lead to Firestore → admin follows up.
 *   Returns { captured: true } so the UI can show a confirmation screen.
 *
 * Body: { firstName, lastName, email, phone, amount, jobType, jobId? }
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, 'financing-apply', 5, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json();
  const { firstName, lastName, email, phone, amount, jobType, jobId } = body;

  if (!firstName || !email || !phone || !amount) {
    return NextResponse.json({ error: 'firstName, email, phone, and amount are required' }, { status: 400 });
  }

  const amountCents = Math.round(Number(amount) * 100);
  if (amountCents < 50000) { // $500 minimum
    return NextResponse.json({ error: 'Minimum financing amount is $500' }, { status: 400 });
  }

  const merchantId = process.env.WISETACK_MERCHANT_ID;
  const apiKey     = process.env.WISETACK_API_KEY;

  // ── Option A: Wisetack is configured — generate application link ─────────
  if (merchantId) {
    // Wisetack loan initiation API (v2)
    // Docs: https://docs.wisetack.us/
    try {
      const wisetackRes = await fetch('https://api.wisetack.us/v1/loan-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey ?? '',
        },
        body: JSON.stringify({
          merchant_id:   merchantId,
          requested_loan_amount: amountCents,
          consumer: {
            first_name:     firstName,
            last_name:      lastName ?? '',
            email,
            mobile_number:  phone.replace(/\D/g, ''),
          },
          order_reference: jobId ?? `repair-${Date.now()}`,
          transaction_purpose: jobType ?? 'HOME_IMPROVEMENT',
        }),
      });
      const wtData = await wisetackRes.json();

      if (wtData.application_url) {
        // Log the lead
        await adminDb.collection('financingLeads').add({
          firstName, lastName, email, phone,
          amount: Number(amount), jobType: jobType ?? null, jobId: jobId ?? null,
          provider: 'wisetack',
          status: 'sent_to_lender',
          createdAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ redirect: wtData.application_url });
      }
    } catch (err) {
      console.error('Wisetack API error:', err);
      // Fall through to lead capture
    }
  }

  // ── Option B: No lender configured (or Wisetack failed) — capture lead ───
  await adminDb.collection('financingLeads').add({
    firstName, lastName: lastName ?? '', email, phone,
    amount: Number(amount),
    jobType:  jobType  ?? null,
    jobId:    jobId    ?? null,
    provider: 'pending',
    status:   'lead_captured',
    createdAt: FieldValue.serverTimestamp(),
  });

  // Notify admin via Firestore (admin will follow up manually / via email sequence)
  // In production: also send a Resend email to the homeowner acknowledging receipt

  return NextResponse.json({
    captured: true,
    message:  "We've saved your application. Our financing team will reach out within 1 business day to complete your pre-qualification.",
  });
}
