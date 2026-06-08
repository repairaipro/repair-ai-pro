import { db } from '@/lib/db';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { getComplexityScore } from './tradeQuestionnaires';

export type PricingData = {
  trade: string;
  specialty: string;
  zipCode: string;
  questionAnswers: Record<string, any>;
  finalPrice: number;
  estimatedPrice?: number;
  complexity: number;
  timestamp: Timestamp;
};

/**
 * Find similar completed jobs for pricing reference
 */
async function findSimilarJobs(
  trade: string,
  zipCode: string,
  answers: Record<string, any>,
  minSimilar: number = 5
): Promise<PricingData[]> {
  try {
    // Query jobs by trade and approximate location (zip prefix)
    const jobsQuery = query(
      collection(db, 'pricingHistory'),
      where('trade', '==', trade.toLowerCase()),
      where('zipCode', '==', zipCode)
    );

    const snapshots = await getDocs(jobsQuery);
    const similarJobs: PricingData[] = [];

    snapshots.docs.forEach(doc => {
      similarJobs.push(doc.data() as PricingData);
    });

    // If not enough exact matches, broaden search
    if (similarJobs.length < minSimilar) {
      const broaderQuery = query(
        collection(db, 'pricingHistory'),
        where('trade', '==', trade.toLowerCase())
      );

      const broaderSnapshots = await getDocs(broaderQuery);
      broaderSnapshots.docs.forEach(doc => {
        const data = doc.data() as PricingData;
        if (!similarJobs.find(j => j.timestamp === data.timestamp)) {
          similarJobs.push(data);
        }
      });
    }

    return similarJobs.slice(0, 100); // return up to 100 similar jobs
  } catch (error) {
    console.error('Error finding similar jobs:', error);
    return [];
  }
}

/**
 * Calculate price statistics from similar jobs
 */
function calculatePriceStats(
  prices: number[]
): {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  stdDev: number;
} {
  if (prices.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p25: 0,
      p75: 0,
      stdDev: 0,
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  const variance =
    sorted.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
    sorted.length;
  const stdDev = Math.sqrt(variance);

  const p25Index = Math.floor(sorted.length * 0.25);
  const p75Index = Math.floor(sorted.length * 0.75);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean),
    median: median,
    p25: sorted[p25Index],
    p75: sorted[p75Index],
    stdDev: Math.round(stdDev),
  };
}

export type EstimateResult = {
  estimatedPrice: number;
  lowRange: number;
  highRange: number;
  confidence: number; // 0-100 based on sample size
  sampleSize: number;
  complexity: number; // 0-100
  riskFactors: string[];
  additionalCosts: string[];
};

/**
 * Get smart cost estimate based on questionnaire answers
 */
export async function getSmartEstimate(
  trade: string,
  zipCode: string,
  answers: Record<string, any>,
  description?: string
): Promise<EstimateResult> {
  try {
    // Find similar jobs
    const similarJobs = await findSimilarJobs(trade, zipCode, answers);

    // Calculate complexity score
    const complexity = getComplexityScore(trade, answers);

    // Get price statistics
    const prices = similarJobs.map(j => j.finalPrice);
    const stats = calculatePriceStats(prices);

    // Base estimate from similar jobs
    let estimatedPrice = stats.mean || 150; // default fallback

    // Adjust based on complexity
    const complexityMultiplier = 0.8 + (complexity / 100) * 0.4; // 0.8x to 1.2x
    estimatedPrice = Math.round(estimatedPrice * complexityMultiplier);

    // Calculate confidence based on sample size
    const confidence = Math.min(100, (similarJobs.length / 20) * 100);

    // Price range (adjust based on confidence)
    const margin = confidence < 50 ? 0.25 : 0.15; // wider margin if less confident
    const lowRange = Math.round(estimatedPrice * (1 - margin));
    const highRange = Math.round(estimatedPrice * (1 + margin));

    // Risk factors based on answers
    const riskFactors: string[] = [];

    if (trade.toLowerCase() === 'plumbing') {
      if (answers.house_age === 'pre_1970')
        riskFactors.push('Old pipes may have hidden corrosion');
      if (answers.water_active === true)
        riskFactors.push('Active water damage may require cleanup');
      if (answers.previous_attempts === true)
        riskFactors.push('Previous repair attempts may complicate fix');
    }

    if (trade.toLowerCase() === 'electrical') {
      if (answers.safety_concern === true)
        riskFactors.push('Safety issue requires immediate attention');
      if (answers.house_age === 'pre_1980')
        riskFactors.push('Old wiring may need code updates');
      if (answers.breaker_trips_frequency === 'constantly')
        riskFactors.push('Frequent breaker trips suggest serious fault');
    }

    if (trade.toLowerCase() === 'hvac') {
      if (answers.system_age === 'very_old')
        riskFactors.push('System may need full replacement');
      if (answers.system_type === 'heat_pump')
        riskFactors.push('Heat pump repairs typically cost 20-30% more');
    }

    if (trade.toLowerCase() === 'roofing') {
      if (answers.roof_age === 'very_old')
        riskFactors.push('Full roof replacement likely needed');
      if (answers.interior_damage === true)
        riskFactors.push('Interior damage may require additional restoration');
    }

    // Additional costs
    const additionalCosts: string[] = [];

    if (answers.same_day_needed === true)
      additionalCosts.push('Same-day service fee (+$50-100)');
    if (answers.emergency === true)
      additionalCosts.push('Emergency fee (+$100-200)');

    if (trade.toLowerCase() === 'plumbing' && answers.fixture_type === 'main_line') {
      additionalCosts.push('Main line work may require permits');
    }

    if (trade.toLowerCase() === 'roofing') {
      additionalCosts.push('Permit and disposal fees may apply');
    }

    return {
      estimatedPrice,
      lowRange,
      highRange,
      confidence: Math.round(confidence),
      sampleSize: similarJobs.length,
      complexity,
      riskFactors,
      additionalCosts,
    };
  } catch (error) {
    console.error('Error getting smart estimate:', error);

    // Return conservative fallback
    return {
      estimatedPrice: 200,
      lowRange: 150,
      highRange: 300,
      confidence: 0,
      sampleSize: 0,
      complexity: getComplexityScore(trade, answers),
      riskFactors: ['Insufficient pricing data available'],
      additionalCosts: [],
    };
  }
}

/**
 * Record a completed job's final price in pricing history
 * Call this when job is confirmed
 */
export async function recordJobPrice(
  trade: string,
  specialty: string,
  zipCode: string,
  finalPrice: number,
  questionAnswers: Record<string, any>,
  estimatedPrice?: number
): Promise<void> {
  try {
    const pricingData: Omit<PricingData, 'timestamp'> = {
      trade: trade.toLowerCase(),
      specialty,
      zipCode,
      questionAnswers,
      finalPrice,
      estimatedPrice,
      complexity: getComplexityScore(trade, questionAnswers),
    };

    // Add to pricingHistory collection
    const pricingRef = collection(db, 'pricingHistory');
    await addDoc(pricingRef, {
      ...pricingData,
      timestamp: Timestamp.now(),
    });

    console.log(
      `Recorded price for ${trade} in ${zipCode}: $${finalPrice} (estimated $${estimatedPrice})`
    );
  } catch (error) {
    console.error('Error recording job price:', error);
  }
}

/**
 * Get pricing trends for a trade in a region
 */
export async function getPricingTrends(
  trade: string,
  zipCode: string
): Promise<{
  trade: string;
  zipCode: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  jobsCount: number;
  lastUpdated: Date;
}> {
  try {
    const trendQuery = query(
      collection(db, 'pricingHistory'),
      where('trade', '==', trade.toLowerCase()),
      where('zipCode', '==', zipCode)
    );

    const snapshots = await getDocs(trendQuery);
    const prices = snapshots.docs.map(doc => (doc.data() as PricingData).finalPrice);

    const stats = calculatePriceStats(prices);

    return {
      trade,
      zipCode,
      avgPrice: stats.mean,
      minPrice: stats.min,
      maxPrice: stats.max,
      jobsCount: snapshots.size,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Error fetching pricing trends:', error);
    return {
      trade,
      zipCode,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      jobsCount: 0,
      lastUpdated: new Date(),
    };
  }
}
