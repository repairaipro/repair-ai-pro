import { Rekognition, DetectLabelsRequest } from '@aws-sdk/client-rekognition';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Initialize AWS clients
 * Requires AWS credentials in environment:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION
 */

const rekognition = new Rekognition({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export type DefectDetection = {
  defectType: string; // "water_damage", "corrosion", "crack", "deterioration", etc.
  confidence: number; // 0-100
  location: string; // "upper_left", "center", "lower_right", etc.
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

/**
 * Download image from URL and analyze with AWS Rekognition
 * Returns detected labels, text, and custom defect classification
 */
export async function analyzeJobPhoto(
  imageUrl: string
): Promise<PhotoAnalysisResult> {
  try {
    // Fetch image from URL
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const imageBytes = Buffer.from(imageBuffer);

    // Call AWS Rekognition DetectLabels
    const labelsRequest: DetectLabelsRequest = {
      Image: {
        Bytes: imageBytes,
      },
      MaxLabels: 50,
      MinConfidence: 60,
    };

    const labelsResponse = await rekognition.detectLabels(labelsRequest);

    // Call AWS Rekognition DetectText
    const textResponse = await rekognition.detectText({
      Image: {
        Bytes: imageBytes,
      },
    });

    // Parse AWS responses and classify defects
    const detectedLabels = labelsResponse.Labels || [];
    const detectedText = textResponse.TextDetections?.filter(
      t => t.Type === 'LINE'
    ).map(t => t.DetectedText || '') || [];

    // Classify water damage indicators
    const waterDamageLabels = [
      'water',
      'wet',
      'moisture',
      'stain',
      'mold',
      'mildew',
      'leak',
      'puddle',
      'flood',
      'damp',
    ];
    const hasWaterDamage = detectedLabels.some(label =>
      waterDamageLabels.some(wd => (label.Name || '').toLowerCase().includes(wd))
    );

    // Classify corrosion/rust
    const corrosionLabels = [
      'rust',
      'corrosion',
      'oxidation',
      'discoloration',
      'deterioration',
      'decay',
    ];
    const hasCorrosion = detectedLabels.some(label =>
      corrosionLabels.some(c => (label.Name || '').toLowerCase().includes(c))
    );

    // Classify cracks/damage
    const crackLabels = [
      'crack',
      'broken',
      'fracture',
      'damage',
      'shattered',
      'crumbling',
      'deteriorating',
    ];
    const hasCracks = detectedLabels.some(label =>
      crackLabels.some(cr => (label.Name || '').toLowerCase().includes(cr))
    );

    // Detect specific fixtures/materials
    const fixtureLabels = [
      'sink',
      'toilet',
      'shower',
      'pipe',
      'faucet',
      'fixture',
      'cabinet',
      'wall',
      'ceiling',
      'floor',
      'electrical',
      'outlet',
      'switch',
      'panel',
      'HVAC',
      'furnace',
      'AC',
      'ductwork',
      'roof',
      'shingle',
      'gutter',
    ];

    // Build defect list
    const defects: DefectDetection[] = [];
    let estimatedSeverity: 'low' | 'medium' | 'high' = 'low';

    if (hasWaterDamage) {
      defects.push({
        defectType: 'water_damage',
        confidence: Math.round(
          (detectedLabels.find(l =>
            waterDamageLabels.some(wd => (l.Name || '').toLowerCase().includes(wd))
          )?.Confidence || 0) * 100
        ) / 100,
        location: 'visible_area',
        severity: 'high',
        description: 'Water damage, stains, or moisture detected',
        recommendations: [
          'Check for active leaks (turn on water/run shower)',
          'Look for mold or mildew (health concern)',
          'May require drying/restoration work',
          'Assess if structural damage exists',
        ],
      });
      estimatedSeverity = 'high';
    }

    if (hasCorrosion) {
      defects.push({
        defectType: 'corrosion',
        confidence: Math.round(
          (detectedLabels.find(l =>
            corrosionLabels.some(c => (l.Name || '').toLowerCase().includes(c))
          )?.Confidence || 0) * 100
        ) / 100,
        location: 'visible_area',
        severity: 'medium',
        description: 'Rust or corrosion detected on pipes/fixtures',
        recommendations: [
          'May indicate pipe age or material degradation',
          'Could affect water quality or lead to leaks',
          'May need replacement rather than repair',
        ],
      });
      if (estimatedSeverity === 'low') estimatedSeverity = 'medium';
    }

    if (hasCracks) {
      defects.push({
        defectType: 'cracks_or_damage',
        confidence: Math.round(
          (detectedLabels.find(l =>
            crackLabels.some(cr => (l.Name || '').toLowerCase().includes(cr))
          )?.Confidence || 0) * 100
        ) / 100,
        location: 'visible_area',
        severity: 'medium',
        description: 'Cracks, fractures, or damage detected',
        recommendations: [
          'Determine if cosmetic or structural',
          'May affect functionality or safety',
          'Could worsen over time if not addressed',
        ],
      });
      if (estimatedSeverity === 'low') estimatedSeverity = 'medium';
    }

    // Determine if video consultation needed
    const requiresVideoConsultation =
      estimatedSeverity === 'high' || defects.length > 2;

    // Generate summary
    let summary = 'Photo analysis complete. ';
    if (defects.length === 0) {
      summary += 'No significant defects detected. Issue may be internal or require hands-on inspection.';
    } else {
      summary += `${defects.length} issue(s) detected: ${defects
        .map(d => d.defectType)
        .join(', ')}.`;
    }

    if (requiresVideoConsultation) {
      summary += ' Video consultation recommended for accurate assessment.';
    }

    return {
      photoUrl: imageUrl,
      analysisDate: new Date(),
      detectedDefects: defects,
      detectedObjects: detectedLabels
        .filter(l => (l.Confidence || 0) >= 70)
        .slice(0, 15)
        .map(l => ({
          label: l.Name || '',
          confidence: Math.round((l.Confidence || 0) * 100) / 100,
        })),
      detectedText,
      estimatedSeverity,
      summary,
      requiresVideoConsultation,
    };
  } catch (error) {
    console.error('Error analyzing photo with AWS Rekognition:', error);
    throw error;
  }
}

/**
 * Analyze multiple photos and aggregate findings
 */
export async function analyzeJobPhotos(
  imageUrls: string[]
): Promise<{
  analyses: PhotoAnalysisResult[];
  aggregatedSeverity: 'low' | 'medium' | 'high';
  allDefects: DefectDetection[];
  overallSummary: string;
  requiresVideoConsultation: boolean;
}> {
  try {
    const analyses = await Promise.all(
      imageUrls.map(url => analyzeJobPhoto(url))
    );

    // Aggregate defects
    const allDefects = analyses.flatMap(a => a.detectedDefects);
    const uniqueDefects = Array.from(
      new Map(allDefects.map(d => [d.defectType, d])).values()
    );

    // Determine overall severity
    let aggregatedSeverity: 'low' | 'medium' | 'high' = 'low';
    if (analyses.some(a => a.estimatedSeverity === 'high')) {
      aggregatedSeverity = 'high';
    } else if (analyses.some(a => a.estimatedSeverity === 'medium')) {
      aggregatedSeverity = 'medium';
    }

    // Check if video needed
    const requiresVideoConsultation =
      analyses.some(a => a.requiresVideoConsultation) ||
      uniqueDefects.length > 3;

    // Generate overall summary
    let overallSummary = `Analysis of ${imageUrls.length} photo(s). `;
    if (uniqueDefects.length === 0) {
      overallSummary += 'No significant defects detected across photos.';
    } else {
      overallSummary += `Issues found: ${uniqueDefects.map(d => d.defectType).join(', ')}.`;
    }
    if (requiresVideoConsultation) {
      overallSummary += ' Video consultation recommended.';
    }

    return {
      analyses,
      aggregatedSeverity,
      allDefects: uniqueDefects,
      overallSummary,
      requiresVideoConsultation,
    };
  } catch (error) {
    console.error('Error analyzing multiple photos:', error);
    throw error;
  }
}

/**
 * Generate contractor-ready report from photo analysis
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
                .map(o => `• ${o.label} (${Math.round(o.confidence * 100)}% confidence)`)
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
