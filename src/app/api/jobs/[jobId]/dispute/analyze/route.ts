import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { openai } from '@/lib/openaiClient';
import { FieldValue } from 'firebase-admin/firestore';

// POST — run GPT-4o Vision comparison between completion photos and dispute evidence
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data()!;

    if (job.userId !== userId && job.claimedBy !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the open dispute
    const disputesSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('disputes')
      .where('status', '==', 'open')
      .limit(1)
      .get();

    if (disputesSnap.empty) {
      return NextResponse.json({ error: 'No open dispute found' }, { status: 404 });
    }

    const disputeDoc = disputesSnap.docs[0];
    const dispute = disputeDoc.data();

    // Return cached analysis if already done
    if (dispute.aiAnalysis) {
      return NextResponse.json({ success: true, analysis: dispute.aiAnalysis });
    }

    // Gather photos for comparison
    const completionSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('completionPhotos')
      .orderBy('uploadedAt', 'asc')
      .limit(4)
      .get();

    let completionUrls: string[] = completionSnap.docs.map((d) => d.data().url);

    // Fallback: contractors may have documented completion via workPhotos instead
    if (completionUrls.length === 0) {
      const workSnap = await adminDb
        .collection('jobs').doc(jobId)
        .collection('workPhotos')
        .where('stage', '==', 'completed')
        .limit(4)
        .get();
      completionUrls = workSnap.docs.map((d) => d.data().url);
    }
    const evidencePhotos: Array<{ url: string; caption?: string }> = dispute.evidencePhotos || [];

    if (completionUrls.length === 0 && evidencePhotos.length === 0) {
      return NextResponse.json({ error: 'No photos available to analyze' }, { status: 400 });
    }

    // Build vision message content
    const imageContent: any[] = [];

    if (completionUrls.length > 0) {
      imageContent.push({ type: 'text', text: `CONTRACTOR'S COMPLETION PHOTOS (${completionUrls.length} photos):` });
      for (const url of completionUrls.slice(0, 3)) {
        imageContent.push({ type: 'image_url', image_url: { url, detail: 'low' } });
      }
    }

    if (evidencePhotos.length > 0) {
      imageContent.push({ type: 'text', text: `\nHOMEOWNER'S DISPUTE EVIDENCE PHOTOS (${evidencePhotos.length} photos):` });
      for (const p of evidencePhotos.slice(0, 3)) {
        imageContent.push({ type: 'image_url', image_url: { url: p.url, detail: 'low' } });
        if (p.caption) imageContent.push({ type: 'text', text: `Caption: "${p.caption}"` });
      }
    }

    imageContent.push({
      type: 'text',
      text: `
Job description: "${job.description || 'Repair work'}"
Dispute category: "${dispute.category || 'Unknown'}"
Homeowner complaint: "${dispute.description || 'No description provided'}"

Please analyze these photos as a neutral third-party inspector and provide:
1. What the contractor's completion photos show (quality, completeness)
2. What the homeowner's evidence shows (the problem they're reporting)
3. Whether the issue in the homeowner's photos appears to be related to the contractor's work
4. A neutral verdict with one of these recommendations: "release_to_contractor" (work appears complete/satisfactory), "refund_homeowner" (work clearly incomplete or damage caused), "partial_resolution" (some work done but issues remain), "needs_admin_review" (complex case, manual review required)
5. Specific findings that support your verdict

Respond in JSON format:
{
  "contractorWorkSummary": "string",
  "homeownerComplaintSummary": "string",
  "isIssueRelatedToWork": boolean,
  "verdict": "release_to_contractor" | "refund_homeowner" | "partial_resolution" | "needs_admin_review",
  "verdictReason": "string (2-3 sentences)",
  "keyFindings": ["string", "string"],
  "confidence": "low" | "medium" | "high"
}`,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a neutral construction/home repair inspector analyzing a payment dispute between a homeowner and contractor. Be objective, specific, and base your analysis only on what is visible in the photos.',
        },
        { role: 'user', content: imageContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content || '{}';
    let analysis: Record<string, any> = {};
    try {
      analysis = JSON.parse(raw);
    } catch {
      analysis = {
        verdict: 'needs_admin_review',
        verdictReason: 'Could not analyze photos automatically. Admin review required.',
        confidence: 'low',
        keyFindings: [],
      };
    }

    // Cache the analysis on the dispute doc
    await disputeDoc.ref.update({
      aiAnalysis: analysis,
      aiAnalyzedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, analysis });
  } catch (err) {
    console.error('Dispute analysis error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
