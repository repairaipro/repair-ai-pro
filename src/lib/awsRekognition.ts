/**
 * Photo Analysis Engine — powered by GPT-4o Vision
 * Drop-in replacement for the former AWS Rekognition implementation.
 * All exported types and function signatures are identical.
 */

import { openai } from './openaiClient';

/* ── Public types ─────────────────────────────────────────────────────────── */

export type DefectDetection = {
  defectType: string; // "water_damage", "corrosion", "crack", "deterioration", etc.
  confidence: number; // 0-100
  location: string;   // "upper_left", "center", "lower_right", etc.
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendations: string[];
};

export type PhotoAnalysisResult = {
  photoUrl: string;
  analysisDate: Date;
  detectedDefects: DefectDetection[];
  detectedObjects: {
    label: string;
    confidence: number;
  }[];
  detectedText: string[];
  estimatedSeverity: 'low' | 'medium' | 'high';
  summary: string;
  requiresVideoConsultation: boolean;
};

/* ── GPT-4o Vision helpers ────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are an expert home-repair inspector AI. Analyze photos of home issues and return structured JSON.
Your response MUST be valid JSON matching this exact schema:
{
  "detectedDefects": [
    {
      "defectType": string,       // e.g. "water_damage", "corrosion", "crack", "deterioration", "electrical_hazard", "mold"
      "confidence": number,       // 0-100
      "location": string,         // e.g. "upper_left", "center", "lower_right", "near_floor", "ceiling"
      "severity": "low"|"medium"|"high",
      "description": string,
      "recommendations": string[] // 2-4 actionable items
    }
  ],
  "detectedObjects": [
    { "label": string, "confidence": number }
  ],
  "detectedText": string[],
  "estimatedSeverity": "low"|"medium"|"high",
  "summary": string,
  "requiresVideoConsultation": boolean
}
Return ONLY the JSON object, no markdown or explanation.`;

type VisionResponse = {
  detectedDefects: DefectDetection[];
  detectedObjects: { label: string; confidence: number }[];
  detectedText: string[];
  estimatedSeverity: 'low' | 'medium' | 'high';
  summary: string;
  requiresVideoConsultation: boolean;
};

function emptyResult(): VisionResponse {
  return {
    detectedDefects: [],
    detectedObjects: [],
    detectedText: [],
    estimatedSeverity: 'low',
    summary: 'No significant defects detected. Issue may be internal or require hands-on inspection.',
    requiresVideoConsultation: false,
  };
}

async function callVision(imageUrl: string): Promise<VisionResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'high' },
            },
            {
              type: 'text',
              text: 'Analyze this home repair photo for defects, damage, and issues. Return the JSON analysis.',
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    // Strip markdown code fences if present
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(json) as VisionResponse;
    return parsed;
  } catch (err) {
    console.error('GPT-4o Vision analysis error:', err);
    return emptyResult();
  }
}

/* ── Exported functions ───────────────────────────────────────────────────── */

/**
 * Analyze a single photo URL using GPT-4o Vision.
 */
export async function analyzeJobPhoto(
  imageUrl: string
): Promise<PhotoAnalysisResult> {
  const vision = await callVision(imageUrl);

  return {
    photoUrl: imageUrl,
    analysisDate: new Date(),
    detectedDefects: vision.detectedDefects,
    detectedObjects: vision.detectedObjects,
    detectedText: vision.detectedText,
    estimatedSeverity: vision.estimatedSeverity,
    summary: vision.summary,
    requiresVideoConsultation: vision.requiresVideoConsultation,
  };
}

/**
 * Analyze multiple photos and aggregate findings.
 */
export async function analyzeJobPhotos(imageUrls: string[]): Promise<{
  analyses: PhotoAnalysisResult[];
  aggregatedSeverity: 'low' | 'medium' | 'high';
  allDefects: DefectDetection[];
  overallSummary: string;
  requiresVideoConsultation: boolean;
}> {
  const analyses = await Promise.all(imageUrls.map(url => analyzeJobPhoto(url)));

  // Deduplicate defects by type, keeping highest confidence
  const defectMap = new Map<string, DefectDetection>();
  for (const analysis of analyses) {
    for (const defect of analysis.detectedDefects) {
      const existing = defectMap.get(defect.defectType);
      if (!existing || defect.confidence > existing.confidence) {
        defectMap.set(defect.defectType, defect);
      }
    }
  }
  const allDefects = Array.from(defectMap.values());

  // Aggregate severity (worst wins)
  let aggregatedSeverity: 'low' | 'medium' | 'high' = 'low';
  if (analyses.some(a => a.estimatedSeverity === 'high')) {
    aggregatedSeverity = 'high';
  } else if (analyses.some(a => a.estimatedSeverity === 'medium')) {
    aggregatedSeverity = 'medium';
  }

  const requiresVideoConsultation =
    analyses.some(a => a.requiresVideoConsultation) || allDefects.length > 3;

  let overallSummary = `Analysis of ${imageUrls.length} photo(s). `;
  if (allDefects.length === 0) {
    overallSummary += 'No significant defects detected across photos.';
  } else {
    overallSummary += `Issues found: ${allDefects.map(d => d.defectType).join(', ')}.`;
  }
  if (requiresVideoConsultation) {
    overallSummary += ' Video consultation recommended.';
  }

  return {
    analyses,
    aggregatedSeverity,
    allDefects,
    overallSummary,
    requiresVideoConsultation,
  };
}

/**
 * Generate a contractor-ready report from a photo analysis result.
 */
export function generateAnalysisReport(analysis: PhotoAnalysisResult): {
  title: string;
  sections: { heading: string; content: string }[];
} {
  return {
    title: `Photo Analysis Report - ${analysis.analysisDate.toLocaleDateString()}`,
    sections: [
      {
        heading: 'Overview',
        content: analysis.summary,
      },
      {
        heading: 'Severity Assessment',
        content: `Estimated Severity: ${analysis.estimatedSeverity.toUpperCase()}`,
      },
      ...(analysis.detectedDefects.length > 0
        ? [
            {
              heading: 'Detected Issues',
              content: analysis.detectedDefects
                .map(
                  d =>
                    `• ${d.defectType} (Confidence: ${d.confidence}%) - ${d.description}\n  Recommendations: ${d.recommendations.join(', ')}`
                )
                .join('\n\n'),
            },
          ]
        : []),
      ...(analysis.detectedObjects.length > 0
        ? [
            {
              heading: 'Identified Components',
              content: analysis.detectedObjects
                .map(o => `• ${o.label} (${Math.round(o.confidence)}% confidence)`)
                .join('\n'),
            },
          ]
        : []),
      {
        heading: 'Next Steps',
        content: analysis.requiresVideoConsultation
          ? 'Video consultation recommended for accurate estimate. Request a video call to discuss findings and get a detailed quote.'
          : 'Contractor can provide estimate based on this analysis. Photos are sufficient for initial pricing.',
      },
    ],
  };
}
