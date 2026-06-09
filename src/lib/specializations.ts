import { db } from '@/lib/db';
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Specialization } from '@/types/firestore';

/**
 * Extract trade and specialty from job description using AI hints
 * Falls back to manual parsing if AI hints not available
 */
export function extractSpecialty(
  trade: string,
  description: string,
  aiDetectedTrade?: string
): string {
  // Common specialty patterns by trade
  const specialtyPatterns: Record<string, string[]> = {
    plumbing: [
      'water heater', 'sink', 'toilet', 'shower', 'tub', 'leak', 'pipe',
      'main line', 'sewer', 'drain', 'faucet', 'installation'
    ],
    electrical: [
      'circuit breaker', 'outlet', 'switch', 'wiring', 'panel', 'light',
      'breaker', 'wire', 'electrical panel', 'rewiring', 'installation'
    ],
    hvac: [
      'ac', 'heating', 'furnace', 'thermostat', 'refrigerant', 'compressor',
      'air filter', 'ductwork', 'cooling', 'air conditioning'
    ],
    appliance: [
      'dishwasher', 'washer', 'dryer', 'refrigerator', 'oven', 'stove',
      'microwave', 'disposal'
    ],
    general: [
      'repair', 'installation', 'maintenance', 'inspection', 'cleaning'
    ],
    roofing: [
      'shingle', 'leak', 'flashing', 'gutter', 'inspection', 'damage'
    ],
  };

  const lowerDesc = description.toLowerCase();
  const patterns = specialtyPatterns[trade.toLowerCase()] || [];

  // Find first matching pattern
  for (const pattern of patterns) {
    if (lowerDesc.includes(pattern)) {
      return pattern;
    }
  }

  // Fallback to generic specialty
  return `${trade} service`;
}

/**
 * Calculate specialization metrics for a contractor
 * Groups completed jobs by trade + specialty and calculates success rates
 */
export async function calculateContractorSpecializations(
  contractorId: string
): Promise<Specialization[]> {
  try {
    // Fetch all completed jobs for this contractor
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('claimedBy', '==', contractorId),
      where('status', 'in', ['completed', 'confirmed'])
    );

    const jobSnaps = await getDocs(jobsQuery);
    const specialtyMap = new Map<string, {
      trade: string;
      specialty: string;
      ratings: number[];
      jobIds: string[];
      totalMinutes: number;
    }>();

    // Group jobs by specialty
    for (const jobSnap of jobSnaps.docs) {
      const job = jobSnap.data();
      const trade = job.trade || 'general';
      const specialty = job.specialty || extractSpecialty(trade, job.description);
      const key = `${trade}::${specialty}`;

      if (!specialtyMap.has(key)) {
        specialtyMap.set(key, {
          trade,
          specialty,
          ratings: [],
          jobIds: [],
          totalMinutes: 0,
        });
      }

      const spec = specialtyMap.get(key)!;
      spec.jobIds.push(jobSnap.id);

      // Get review for this job to extract rating
      const reviewsQuery = query(
        collection(db, 'jobs', jobSnap.id, 'reviews')
      );
      const reviewSnaps = await getDocs(reviewsQuery);
      if (reviewSnaps.docs.length > 0) {
        const rating = reviewSnaps.docs[0].data().rating || 0;
        spec.ratings.push(rating);
      }
    }

    // Convert to Specialization array
    const specializations: Specialization[] = [];

    for (const [key, data] of specialtyMap.entries()) {
      const completedJobs = data.jobIds.length;
      const avgRating = data.ratings.length > 0
        ? data.ratings.reduce((a, b) => a + b) / data.ratings.length
        : 0;
      const successRate = data.ratings.length > 0
        ? (data.ratings.filter(r => r >= 4).length / data.ratings.length) * 100
        : 0;

      // Verified if 10+ completed jobs AND 90%+ success rate
      const verified = completedJobs >= 10 && successRate >= 90;

      specializations.push({
        id: key,
        trade: data.trade,
        specialty: data.specialty,
        completedJobs,
        successRate: Math.round(successRate * 10) / 10,
        averageRating: Math.round(avgRating * 10) / 10,
        verified,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    return specializations;
  } catch (error) {
    console.error('Error calculating specializations:', error);
    return [];
  }
}

/**
 * Save specializations to Firestore
 */
export async function saveSpecializations(
  contractorId: string,
  specializations: Specialization[]
): Promise<void> {
  try {
    const batch: Promise<void>[] = [];

    for (const spec of specializations) {
      const specRef = doc(
        db,
        'contractors',
        contractorId,
        'specializations',
        spec.id
      );
      batch.push(setDoc(specRef, spec));
    }

    await Promise.all(batch);
  } catch (error) {
    console.error('Error saving specializations:', error);
  }
}

/**
 * Get specializations for a contractor
 */
export async function getContractorSpecializations(
  contractorId: string
): Promise<Specialization[]> {
  try {
    const specsQuery = query(
      collection(db, 'contractors', contractorId, 'specializations')
    );
    const snapshots = await getDocs(specsQuery);
    return snapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Specialization));
  } catch (error) {
    console.error('Error fetching specializations:', error);
    return [];
  }
}

/**
 * Get verified specializations (those with 10+ jobs and 90%+ success rate)
 */
export async function getVerifiedSpecializations(
  contractorId: string
): Promise<Specialization[]> {
  const specs = await getContractorSpecializations(contractorId);
  return specs.filter(s => s.verified);
}

/**
 * Trigger specialization recalculation for a contractor
 * Call this after a job is completed and reviewed
 */
export async function recalculateSpecializations(
  contractorId: string
): Promise<void> {
  const specs = await calculateContractorSpecializations(contractorId);
  await saveSpecializations(contractorId, specs);
}
