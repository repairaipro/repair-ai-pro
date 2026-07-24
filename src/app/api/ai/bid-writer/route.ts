import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { openai } from '@/lib/openaiClient';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

/**
 * POST /api/ai/bid-writer
 *
 * Generates a smart bid (price, ETA, message) for a contractor on a specific job.
 *
 * Strategy:
 *  1. Load job details + AI price estimate
 *  2. Load contractor profile (trade, experience, rating, bio)
 *  3. Pull contractor's last 8 WINNING bids → learn their pricing patterns & voice
 *  4. Pull market comps: last 30 similar completed jobs → median price
 *  5. Feed everything to GPT-4o → structured JSON bid
 *
 * Body: { jobId: string }
 * Returns: { amount, etaDays, message, reasoning, priceRange, confidence }
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(req, 'bid-writer', 15, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  // ── 1. Load job ──────────────────────────────────────────────────────
  const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
  if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const job = jobSnap.data()!;

  // ── 2. Load contractor profile ───────────────────────────────────────
  const contractorSnap = await adminDb.collection('contractors').doc(uid).get();
  if (!contractorSnap.exists) return NextResponse.json({ error: 'No contractor profile' }, { status: 403 });
  const contractor = contractorSnap.data()!;

  // ── 3. Pull contractor's last 8 winning bids ─────────────────────────
  // Jobs they were awarded (claimedBy = uid, confirmed or completed)
  const wonJobsSnap = await adminDb.collection('jobs')
    .where('claimedBy', '==', uid)
    .where('status', 'in', ['confirmed', 'completed', 'in_progress'])
    .orderBy('createdAt', 'desc')
    .limit(8)
    .get();

  const pastWins: { price: number; description: string; trade: string }[] = [];
  await Promise.all(
    wonJobsSnap.docs.map(async (jobDoc) => {
      try {
        const bidSnap = await adminDb
          .collection('jobs').doc(jobDoc.id)
          .collection('bids').doc(uid)
          .get();
        if (bidSnap.exists) {
          const b = bidSnap.data()!;
          pastWins.push({
            price:       b.amount ?? 0,
            description: (jobDoc.data().description ?? '').slice(0, 100),
            trade:       jobDoc.data().trade ?? '',
          });
        }
      } catch { /* skip */ }
    })
  );

  // ── 4. Market comps: recent completed jobs same trade ─────────────────
  const trade = job.trade ?? contractor.trade ?? '';
  const compsSnap = await adminDb.collection('jobs')
    .where('trade', '==', trade)
    .where('status', 'in', ['confirmed', 'completed'])
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get();

  const compPrices: number[] = [];
  compsSnap.docs.forEach(d => {
    const p = d.data().paymentAmountUsd ?? d.data().estimatedValue;
    if (p && p > 0) compPrices.push(p);
  });

  const marketMedian = compPrices.length > 0
    ? compPrices.sort((a, b) => a - b)[Math.floor(compPrices.length / 2)]
    : null;

  // ── 5. Build context for AI ───────────────────────────────────────────
  const aiPriceRange = job.estimatedCost
    ? `$${job.estimatedCost.low ?? '?'} – $${job.estimatedCost.high ?? '?'} (AI fair-price estimate)`
    : null;

  const locationStr = typeof job.location === 'string'
    ? job.location
    : job.location?.city ?? job.city ?? contractor.city ?? 'Houston, TX';

  const contractorContext = [
    `Name: ${contractor.name ?? 'Contractor'}`,
    `Trade: ${contractor.trade ?? trade}`,
    `Experience: ${contractor.experience ? contractor.experience + ' years' : 'experienced'}`,
    `Rating: ${contractor.avgRating ? contractor.avgRating.toFixed(1) + '/5' : 'new to platform'}`,
    `Jobs completed on platform: ${contractor.jobsCompleted ?? 0}`,
    contractor.bio ? `Bio: ${contractor.bio.slice(0, 200)}` : null,
    contractor.city ? `Based in: ${contractor.city}` : null,
  ].filter(Boolean).join('\n');

  const pastWinsContext = pastWins.length > 0
    ? pastWins.map(w => `  - $${w.price} for: "${w.description}" (${w.trade})`).join('\n')
    : '  None yet (new to platform)';

  const prompt = `You are an expert bid writing assistant for a home repair marketplace. Generate an optimal bid for a contractor.

## JOB DETAILS
Trade: ${trade}
Location: ${locationStr}
Description: ${job.description ?? 'No description provided'}
${job.aiSummary ? `AI Summary: ${job.aiSummary}` : ''}
${job.urgency ? `Urgency: ${job.urgency}` : ''}
${aiPriceRange ? `RepairAI Fair-Price Range: ${aiPriceRange}` : ''}
${marketMedian ? `Market median for similar completed jobs: $${Math.round(marketMedian)}` : ''}

## CONTRACTOR PROFILE
${contractorContext}

## CONTRACTOR'S PAST WINNING BIDS (learn their pricing patterns)
${pastWinsContext}

## YOUR TASK
Generate the ideal bid. Return ONLY valid JSON, no markdown, no explanation outside the JSON:

{
  "amount": <number — recommended bid price in USD, no cents needed>,
  "etaDays": <number — one of: 1, 3, 7, 14>,
  "message": "<string — 3-4 sentences, warm but professional, written in first person as the contractor. Open with specific acknowledgment of the job. Mention relevant experience. End with availability. DO NOT use placeholder text like [your name]. Write it ready to send.>",
  "reasoning": "<string — 1-2 sentences explaining the price recommendation for the contractor to understand>",
  "confidence": "<'high' | 'medium' | 'low'>"
}

Pricing rules:
- If RepairAI fair-price range exists, stay within it unless past wins justify going above
- If contractor has past wins, stay consistent with their pricing patterns
- If no data, use market median if available, otherwise estimate conservatively for the trade/job scope
- Never bid below $75 for any job
- Round to nearest $25 for amounts under $500, nearest $50 for amounts over $500`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    // Validate required fields
    const amount  = Number(parsed.amount);
    const etaDays = Number(parsed.etaDays);

    if (!amount || amount <= 0) throw new Error('Invalid amount from AI');
    if (!parsed.message)        throw new Error('No message from AI');

    // Pick nearest valid ETA option
    const validEtas = [1, 3, 7, 14];
    const eta = validEtas.reduce((prev, curr) =>
      Math.abs(curr - etaDays) < Math.abs(prev - etaDays) ? curr : prev, 3);

    return NextResponse.json({
      success:    true,
      amount:     Math.round(amount / 25) * 25, // round to nearest $25
      etaDays:    eta,
      message:    parsed.message,
      reasoning:  parsed.reasoning ?? '',
      confidence: parsed.confidence ?? 'medium',
      context: {
        aiPriceRange,
        marketMedian:   marketMedian ? Math.round(marketMedian) : null,
        pastWinsCount:  pastWins.length,
        avgPastWinPrice: pastWins.length > 0
          ? Math.round(pastWins.reduce((s, w) => s + w.price, 0) / pastWins.length)
          : null,
      },
    });
  } catch (err: any) {
    console.error('Bid writer AI error:', err);
    return NextResponse.json({ error: 'AI unavailable, try again' }, { status: 500 });
  }
}
