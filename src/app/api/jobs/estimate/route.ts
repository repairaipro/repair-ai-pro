import { NextRequest, NextResponse } from 'next/server';
import { getQuestionsForTrade, validateAnswers } from '@/lib/tradeQuestionnaires';
import { getSmartEstimate, recordJobPrice } from '@/lib/pricingEstimate';
import { openai as openaiClient } from '@/lib/openaiClient';
import { adminAuth } from '@/lib/firebaseAdmin';

/** Verify Firebase ID token from Authorization header; returns uid or null */
async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * GET /api/jobs/estimate?trade=plumbing
 * Get questionnaire questions for a trade
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trade = searchParams.get('trade');

    if (!trade) {
      return NextResponse.json(
        { error: 'Trade parameter required' },
        { status: 400 }
      );
    }

    const questions = getQuestionsForTrade(trade);

    return NextResponse.json({
      success: true,
      trade,
      questions,
      questionCount: questions.length,
    });
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questionnaire' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/estimate
 * Get smart cost estimate based on questionnaire answers
 *
 * Body:
 * {
 *   trade: string,
 *   zipCode: string,
 *   answers: { [key]: value },
 *   description?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuth(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { trade, zipCode, answers, description } = body;

    if (!trade || !zipCode || !answers) {
      return NextResponse.json(
        { error: 'trade, zipCode, and answers required' },
        { status: 400 }
      );
    }

    // Validate answers
    const validation = validateAnswers(trade, answers);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Get smart estimate from historical pricing data
    const estimate = await getSmartEstimate(trade, zipCode, answers, description);

    // Use OpenAI to refine estimate with context
    let refinedEstimate = estimate.estimatedPrice;
    let aiInsights = '';
    // Typical share of the total that is labor (vs. parts/materials). Defaults
    // to 60% labor — a reasonable service-trade average — until the AI refines it.
    let laborPercent = 60;

    try {
      if (openaiClient) {
        const answerSummary = Object.entries(answers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');

        const response = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user' as const,
              content: `You are a pricing expert for home services. A homeowner in zip code ${zipCode} needs ${trade} work.

Questionnaire answers:
${answerSummary}

Historical pricing data shows:
- Average: $${estimate.estimatedPrice}
- Range: $${estimate.lowRange}-$${estimate.highRange}
- Complexity score: ${estimate.complexity}/100
- Based on ${estimate.sampleSize} similar jobs

Based on the complexity factors indicated by their answers, should we adjust the estimate? Consider:
1. Are there any risk factors that would increase cost?
2. Are there any factors that would decrease cost?
3. What is the most likely price range?

Return ONLY a JSON object with this exact shape, no markdown:
{
  "refinedEstimate": number,   // your adjusted single-number estimate in USD, e.g. 275
  "laborPercent": number,      // typical share of the total that is labor vs parts, 0-100 (most service jobs are 50-75)
  "explanation": string,       // 1-2 sentences on why you adjusted (or didn't) it
  "thingToKnow": string        // one thing the homeowner should know before scheduling
}`,
            },
          ],
          max_tokens: 300,
        });

        const raw = response.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw) as { refinedEstimate?: number; laborPercent?: number; explanation?: string; thingToKnow?: string };

        if (typeof parsed.refinedEstimate === 'number' && parsed.refinedEstimate > 0) {
          refinedEstimate = Math.round(parsed.refinedEstimate);
        }
        if (typeof parsed.laborPercent === 'number' && parsed.laborPercent >= 0 && parsed.laborPercent <= 100) {
          laborPercent = Math.round(parsed.laborPercent);
        }
        aiInsights = [parsed.explanation, parsed.thingToKnow].filter(Boolean).join('\n');
      }
    } catch (aiError) {
      console.error('OpenAI refinement failed, using base estimate:', aiError);
      // Continue with base estimate
    }

    return NextResponse.json({
      success: true,
      estimate: {
        ...estimate,
        estimatedPrice: refinedEstimate,
        lowRange: Math.round(refinedEstimate * 0.85),
        highRange: Math.round(refinedEstimate * 1.15),
        laborPercent,
      },
      aiInsights,
    });
  } catch (error) {
    console.error('Error calculating estimate:', error);
    return NextResponse.json(
      { error: 'Failed to calculate estimate' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/jobs/estimate
 * Record final job price for future estimation (called after job confirmed)
 *
 * Body:
 * {
 *   trade: string,
 *   specialty: string,
 *   zipCode: string,
 *   finalPrice: number,
 *   answers: Record<string, any>,
 *   estimatedPrice?: number
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const uid = await verifyAuth(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      trade,
      specialty,
      zipCode,
      finalPrice,
      answers,
      estimatedPrice,
    } = body;

    if (!trade || !zipCode || !finalPrice || !answers) {
      return NextResponse.json(
        { error: 'trade, zipCode, finalPrice, and answers required' },
        { status: 400 }
      );
    }

    // Record in pricing history
    await recordJobPrice(
      trade,
      specialty || trade,
      zipCode,
      finalPrice,
      answers,
      estimatedPrice
    );

    return NextResponse.json({
      success: true,
      message: 'Price recorded for future estimates',
    });
  } catch (error) {
    console.error('Error recording job price:', error);
    return NextResponse.json(
      { error: 'Failed to record job price' },
      { status: 500 }
    );
  }
}
