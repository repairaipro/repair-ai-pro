import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { searchProducts } from '@/lib/productSearch';
import {
  getSearchQueriesForDefect,
  PRODUCT_SOURCES,
  calculateCommission,
} from '@/lib/productMatching';
import { openai as openaiClient } from '@/lib/openaiClient';

/**
 * POST /api/jobs/[jobId]/product-recommendations
 * Generate product recommendations based on photo analysis
 *
 * Request body:
 * {
 *   defects: Array<{
 *     defectType: string,
 *     confidence: number,
 *     description: string
 *   }>,
 *   budget?: number,
 *   priority?: 'low' | 'mid' | 'high'  // for price tier
 * }
 *
 * Response:
 * - Recommended products from 1000+ retailers
 * - Price comparisons
 * - Affiliate links with commission tracking
 * - Liability disclaimers
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify access to job
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobSnap.data();
    const isHomeowner = jobData?.userId === userId;
    const isContractor = jobData?.claimedBy === userId;

    if (!isHomeowner && !isContractor) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse request
    const body = await request.json() as {
      defects?: Array<{ defectType: string; confidence: number; description: string }>;
      analysisId?: string;
      budget?: number;
      priority?: 'low' | 'mid' | 'high';
    };

    let defects = body.defects || [];

    // If analysisId provided, fetch defects from photo analysis
    if (body.analysisId && !defects.length) {
      const analysisSnap = await adminDb
        .collection('jobs').doc(jobId)
        .collection('photoAnalyses').doc(body.analysisId)
        .get();

      if (analysisSnap.exists) {
        const analysis = analysisSnap.data() ?? {};
        defects = ((analysis.defects as any[]) || []).map((d: any) => ({
          defectType: d.defectType,
          confidence: d.confidence,
          description: d.description,
        }));
      }
    }

    if (!defects.length) {
      return NextResponse.json(
        { error: 'No defects provided' },
        { status: 400 }
      );
    }

    // Generate recommendations for each defect
    const recommendations: any[] = [];
    let totalPotentialCommission = 0;

    for (const defect of defects) {
      // Get search queries for this defect
      const searchQueries = getSearchQueriesForDefect(defect.defectType) || [
        defect.description,
      ];

      if (searchQueries.length === 0) continue;

      // Use primary search query
      const query = searchQueries[0];

      // Search across all retailers
      const searchResult = await searchProducts({
        query,
        limit: 15,
        minPrice: body.priority === 'low' ? undefined : 50,
        maxPrice: body.budget || undefined,
      });

      if (searchResult.products.length === 0) {
        continue;
      }

      // Pick price tier based on priority
      let selectedProducts;
      if (body.priority === 'low') {
        selectedProducts = searchResult.products.slice(0, 3); // cheapest options
      } else if (body.priority === 'high') {
        selectedProducts = searchResult.products.slice(-3); // most expensive/premium
      } else {
        selectedProducts = searchResult.products.slice(3, 6); // mid-range
      }

      // Calculate total commission for this defect
      const defectCommission = selectedProducts.reduce(
        (sum, p) => sum + p.commission,
        0
      );
      totalPotentialCommission += defectCommission;

      recommendations.push({
        defectType: defect.defectType,
        description: defect.description,
        confidence: defect.confidence,
        products: selectedProducts,
        sourcesFound: searchResult.sourcesSearched,
        estimatedCost: {
          low: Math.min(...selectedProducts.map(p => p.price)),
          mid:
            selectedProducts[Math.floor(selectedProducts.length / 2)]?.price ||
            0,
          high: Math.max(...selectedProducts.map(p => p.price)),
        },
        potentialCommission: Math.round(defectCommission * 100) / 100,
      });
    }

    // Use AI to add context/disclaimers
    let disclaimer =
      'This AI analysis is for informational purposes only. Always verify product compatibility with a professional contractor before purchasing. Prices and availability may change. Repair AI Pro is not liable for product incompatibility or defects.';

    try {
      if (openaiClient) {
        const response = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `Generate a brief, customer-friendly disclaimer (1-2 sentences) for home repair product recommendations. The disclaimer should:
1. Emphasize consulting a professional before purchasing
2. Note that AI recommendations should be verified
3. Mention that homeowner is responsible for verification
4. Keep it concise and non-legal-sounding`,
            },
          ],
          max_tokens: 100,
        });

        disclaimer = response.choices[0]?.message?.content || disclaimer;
      }
    } catch (aiError) {
      console.error('AI disclaimer generation failed, using default');
    }

    // Store recommendations in Firestore
    const recsDoc = await adminDb
      .collection('jobs').doc(jobId)
      .collection('productRecommendations')
      .add({
        recommendations,
        analysisId: body.analysisId,
        totalPotentialCommission,
        budget: body.budget,
        priority: body.priority || 'mid',
        sourcesSummary: Array.from(
          new Set(
            recommendations.flatMap((r: any) => r.sourcesFound as string[])
          )
        ),
        disclaimer,
        generatedAt: FieldValue.serverTimestamp(),
        generatedBy: userId,
      });

    // Update job with recommendation reference
    await adminDb.collection('jobs').doc(jobId).update({
      latestProductRecommendationId: recsDoc.id,
      productRecommendationTime: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      recommendationId: recsDoc.id,
      data: {
        recommendations,
        summary: {
          defectsAnalyzed: defects.length,
          productsFound: recommendations.reduce(
            (sum: number, r: any) => sum + r.products.length,
            0
          ),
          uniqueRetailers: Array.from(
            new Set(
              recommendations
                .flatMap((r: any) => r.products)
                .map((p: any) => p.source)
            )
          ).length,
          totalPotentialCommission: Math.round(
            totalPotentialCommission * 100
          ) / 100,
          estimatedTotalCost: {
            low: Math.min(
              ...recommendations.map((r: any) => r.estimatedCost.low)
            ),
            mid:
              recommendations[Math.floor(recommendations.length / 2)]
                ?.estimatedCost.mid || 0,
            high: Math.max(
              ...recommendations.map((r: any) => r.estimatedCost.high)
            ),
          },
        },
        disclaimer,
        apiVersion: '1.0',
      },
    });
  } catch (error) {
    console.error('Error generating product recommendations:', error);

    if (
      error instanceof Error &&
      error.message.includes('API key')
    ) {
      return NextResponse.json(
        {
          error: 'Product recommendation service incomplete',
          message:
            'Some retailer APIs not configured. Contact support to enable full product search.',
          details: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/[jobId]/product-recommendations
 * Retrieve existing recommendations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const searchParams = request.nextUrl.searchParams;
    const recommendationId = searchParams.get('recommendationId');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify access
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobSnap.data();
    const isHomeowner = jobData?.userId === userId;
    const isContractor = jobData?.claimedBy === userId;

    if (!isHomeowner && !isContractor) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get specific recommendation or latest
    let recSnap;
    if (recommendationId) {
      recSnap = await adminDb
        .collection('jobs').doc(jobId)
        .collection('productRecommendations').doc(recommendationId)
        .get();
    } else {
      // Get latest
      const snap = await adminDb
        .collection('jobs').doc(jobId)
        .collection('productRecommendations')
        .orderBy('generatedAt', 'desc')
        .limit(1)
        .get();
      recSnap = snap.docs[0];
    }

    if (!recSnap?.exists) {
      return NextResponse.json(
        { error: 'No recommendations found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      recommendation: {
        id: recSnap.id,
        ...recSnap.data(),
      },
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
