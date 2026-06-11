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

    try {
      if (openaiClient) {
        const answerSummary = Object.entries(answers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');

        const response = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
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

Respond with:
1. Refined estimate (single number)
2. Brief explanation of adjustment (1-2 sentences)
3. One thing they should know before scheduling`,
            },
          ],
          max_tokens: 200,
        });

        const aiResponse = response.choices[0]?.message?.content || '';
        const lines = aiResponse.split('\n');

        // Parse refined estimate from first line
        const firstLine = lines[0] || '';
        const priceMatch = firstLine.match(/\$?([\d,]+)/);
        if (priceMatch) {
          refinedEstimate = parseInt(priceMatch[1].replace(/,/g, ''), 10);
        }

        aiInsights = aiResponse;
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
