
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input: string = body.input || '';
    const media: string[] = Array.isArray(body.media) ? body.media : [];
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = [
      'You are RepairAI, an expert home repair diagnostician.',
      'User description: ' + input,
      media.length ? 'Attached media URLs: ' + media.join(', ') : 'No media provided.',
      'Return: likely cause(s), quick checks, parts/tools, risk/safety notes, and a plain-English repair plan.'
    ].join('\n\n');

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const answer = completion.choices?.[0]?.message?.content || 'No answer';
    return NextResponse.json({ answer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'OpenAI error' }, { status: 500 });
  }
}
