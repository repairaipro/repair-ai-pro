import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { openai } from '@/lib/openaiClient';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

type Message = { role: 'user' | 'assistant'; content: string };

/**
 * POST /api/ai/studio-assistant
 *
 * Claude-style business advisor for contractors. Has full context about
 * their trade, earnings, rating, market, and business history.
 *
 * Body: { messages: Message[], refreshContext?: boolean }
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(req, 'studio-assistant', 20, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const { messages }: { messages: Message[] } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 });

  // ── Load contractor context ───────────────────────────────────────────
  const contractorSnap = await adminDb.collection('contractors').doc(uid).get();
  const c = contractorSnap.exists ? contractorSnap.data()! : {};

  // Last 30 days revenue
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentJobsSnap = await adminDb.collection('jobs')
    .where('claimedBy', '==', uid)
    .where('status', 'in', ['confirmed', 'completed'])
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const recentJobs = recentJobsSnap.docs.filter(d => {
    const t = d.data().createdAt?.toDate?.();
    return t && t >= thirtyDaysAgo;
  });
  const monthRevenue = recentJobs.reduce((s, d) => s + (d.data().paymentAmountUsd ?? 0), 0);

  // Build rich context
  const name        = c.name ?? 'Contractor';
  const trade       = c.trade ?? 'General';
  const trades      = (c.trades ?? [trade]).join(', ');
  const city        = c.city ?? 'Houston, TX';
  const experience  = c.experience ? `${c.experience} years of experience` : 'experienced';
  const rating      = c.avgRating ? `${c.avgRating.toFixed(1)}/5 rating` : 'new to the platform';
  const jobsDone    = c.jobsCompleted ?? 0;
  const plan        = c.subscriptionPlan === 'elite' ? 'Elite Pro' : c.subscriptionPlan === 'pro' ? 'Pro' : 'Free';
  const monthEarn   = monthRevenue > 0 ? `$${Math.round(monthRevenue).toLocaleString()}` : 'not tracked yet';
  const followers   = c.followerCount ?? 0;

  const systemPrompt = `You are a senior business advisor for ${name}, a ${trade} contractor based in ${city}.

## Their Business Profile
- Trade(s): ${trades}
- Experience: ${experience}
- Rating: ${rating} (${jobsDone} jobs completed on RepairAI)
- Subscription: ${plan} tier
- Revenue last 30 days: ${monthEarn}
- Social following: ${followers} followers on RepairAI
- Market: Houston, TX metro area

## Your Role
You are their personal business advisor — part pricing expert, part operations coach, part growth strategist. You know the home repair marketplace deeply:
- Typical contractor margins are 30-50% gross, 15-25% net
- Houston market is competitive; response speed wins more than price
- Before/after photos on social media drive 30-40% of inbound leads
- Subscription Pro contractors win 3× more jobs due to priority placement
- Common pain points: slow-paying homeowners, low-ball competitors, seasonal demand swings

## How to respond
- Be direct and specific. No vague advice.
- When they ask about pricing, give a real number range with reasoning.
- When they ask for a message draft, write the full message ready to send.
- When they ask about taxes or business, give practical guidance (note: not official tax/legal advice).
- Keep answers under 250 words unless a detailed breakdown is clearly needed.
- Use bullet points for lists, bold for key numbers or actions.
- Never refuse a reasonable business question. Always give a concrete starting point.`;

  const openaiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      max_tokens: 800,
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content ?? 'Sorry, try again.';
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('Studio assistant error:', err);
    return NextResponse.json({ error: 'AI unavailable, try again' }, { status: 500 });
  }
}
