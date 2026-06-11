import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type { QualityScore } from '@/types/firestore';
import { getContractorSpecializations } from './specializations';

/**
 * SERVER-ONLY — uses the Firebase Admin SDK.
 * Import this module only from API routes / server code, never client components.
 */

/**
 * Default weights for quality score calculation
 * Total should sum to 1.0
 */
const DEFAULT_WEIGHTS = {
  rating: 0.25,
  responseTime: 0.15,
  timeAccuracy: 0.20,
  photoEvidenceScore: 0.15,
  disputeRate: 0.15,
  specializations: 0.10,
};

/**
 * Calculate response time metric (how fast contractor responds to invites)
 * Returns: avg hours to respond (lower is better, 0-100 scale)
 */
async function calculateResponseTime(contractorId: string): Promise<number> {
  try {
    // Get all jobs where this contractor was invited
    const jobSnaps = await adminDb
      .collection('jobs')
      .where('invitations', 'array-contains', contractorId)
      .get();

    if (jobSnaps.empty) return 50; // neutral score

    const responseTimes: number[] = [];

    for (const jobSnap of jobSnaps.docs) {
      // Get invitation timestamp
      const inviteSnap = await adminDb
        .collection('jobs').doc(jobSnap.id)
        .collection('invitations').doc(contractorId)
        .get();

      const invite = inviteSnap.data();
      if (inviteSnap.exists && invite?.createdAt) {
        const inviteTime = invite.createdAt.toDate();
        let responseTime = 999; // assume no response

        // Check if contractor accepted/declined
        if (invite.respondedAt) {
          const respondTime = invite.respondedAt.toDate();
          responseTime = (respondTime.getTime() - inviteTime.getTime()) / (1000 * 60 * 60); // hours
        }

        responseTimes.push(responseTime);
      }
    }

    if (responseTimes.length === 0) return 50;

    const avgHours = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    // Convert to 0-100 scale: 0-2 hours = 100, 24+ hours = 0
    return Math.max(0, Math.min(100, 100 - (avgHours / 24) * 100));
  } catch (error) {
    console.error('Error calculating response time:', error);
    return 50;
  }
}

/**
 * Calculate time accuracy metric (jobs completed within estimated time)
 * Returns: % of jobs completed on time
 */
async function calculateTimeAccuracy(contractorId: string): Promise<number> {
  try {
    const jobSnaps = await adminDb
      .collection('jobs')
      .where('claimedBy', '==', contractorId)
      .where('status', 'in', ['completed', 'confirmed'])
      .get();

    if (jobSnaps.empty) return 50;

    let onTimeCount = 0;
    for (const jobSnap of jobSnaps.docs) {
      const job = jobSnap.data();
      const completedAt = job.completedAt?.toDate();
      const estimatedCompletionDate = job.estimatedCompletionDate?.toDate();

      if (completedAt && estimatedCompletionDate) {
        if (completedAt <= estimatedCompletionDate) {
          onTimeCount++;
        }
      }
    }

    return (onTimeCount / jobSnaps.size) * 100;
  } catch (error) {
    console.error('Error calculating time accuracy:', error);
    return 50;
  }
}

/**
 * Calculate photo evidence score (% of jobs with 3+ photos)
 */
async function calculatePhotoEvidenceScore(contractorId: string): Promise<number> {
  try {
    const jobSnaps = await adminDb
      .collection('jobs')
      .where('claimedBy', '==', contractorId)
      .where('status', 'in', ['completed', 'confirmed'])
      .get();

    if (jobSnaps.empty) return 50;

    let photosCount = 0;
    for (const jobSnap of jobSnaps.docs) {
      const photoSnaps = await adminDb
        .collection('jobs').doc(jobSnap.id)
        .collection('workPhotos')
        .limit(3)
        .get();
      if (photoSnaps.size >= 3) {
        photosCount++;
      }
    }

    return (photosCount / jobSnaps.size) * 100;
  } catch (error) {
    console.error('Error calculating photo evidence score:', error);
    return 50;
  }
}

/**
 * Calculate dispute rate (% of jobs with disputes)
 */
async function calculateDisputeRate(contractorId: string): Promise<number> {
  try {
    const jobSnaps = await adminDb
      .collection('jobs')
      .where('claimedBy', '==', contractorId)
      .where('status', 'in', ['completed', 'confirmed'])
      .get();

    if (jobSnaps.empty) return 0;

    let disputeCount = 0;
    for (const jobSnap of jobSnaps.docs) {
      const disputeSnaps = await adminDb
        .collection('jobs').doc(jobSnap.id)
        .collection('disputes')
        .limit(1)
        .get();
      if (disputeSnaps.size > 0) {
        disputeCount++;
      }
    }

    // Return as % (0 is good, 100 is bad)
    return (disputeCount / jobSnaps.size) * 100;
  } catch (error) {
    console.error('Error calculating dispute rate:', error);
    return 0;
  }
}

/**
 * Calculate overall quality score (0-100)
 */
export async function calculateQualityScore(
  contractorId: string,
  contractorRating: number = 0,
  reviewCount: number = 0
): Promise<QualityScore> {
  try {
    // Get contractor's existing rating from profile
    const contractorSnap = await adminDb.collection('contractors').doc(contractorId).get();
    const rating = contractorSnap.data()?.rating || contractorRating || 0;

    // Calculate all metrics
    const [
      responseTime,
      timeAccuracy,
      photoEvidenceScore,
      disputeRate,
    ] = await Promise.all([
      calculateResponseTime(contractorId),
      calculateTimeAccuracy(contractorId),
      calculatePhotoEvidenceScore(contractorId),
      calculateDisputeRate(contractorId),
    ]);

    // Get specializations
    const specs = await getContractorSpecializations(contractorId);
    const verifiedSpecs = specs.filter(s => s.verified);
    const avgSpecRating = specs.length > 0
      ? specs.reduce((sum, s) => sum + s.averageRating, 0) / specs.length
      : 0;

    // Get job completion rate
    const allJobs = await adminDb
      .collection('jobs')
      .where('claimedBy', '==', contractorId)
      .get();
    const completedJobs = allJobs.docs.filter(
      d => ['completed', 'confirmed'].includes(d.data().status)
    ).length;
    const jobCompletionRate = allJobs.size > 0
      ? (completedJobs / allJobs.size) * 100
      : 0;

    // Normalize metrics to 0-100 scale
    const ratingScore = (rating / 5) * 100; // convert 0-5 to 0-100
    const specialScore = (verifiedSpecs.length / 5) * 100; // assume max 5 specialties

    // Calculate weighted overall score
    const overallScore = Math.round(
      (ratingScore * DEFAULT_WEIGHTS.rating) +
      (responseTime * DEFAULT_WEIGHTS.responseTime) +
      (timeAccuracy * DEFAULT_WEIGHTS.timeAccuracy) +
      (photoEvidenceScore * DEFAULT_WEIGHTS.photoEvidenceScore) +
      ((100 - disputeRate) * DEFAULT_WEIGHTS.disputeRate) + // invert dispute rate
      (specialScore * DEFAULT_WEIGHTS.specializations)
    );

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      responseTime: Math.round(responseTime * 10) / 10,
      timeAccuracy: Math.round(timeAccuracy * 10) / 10,
      photoEvidenceScore: Math.round(photoEvidenceScore * 10) / 10,
      disputeRate: Math.round(disputeRate * 10) / 10,
      specializations: {
        count: verifiedSpecs.length,
        avgRatingPerSpecialty: Math.round(avgSpecRating * 10) / 10,
      },
      jobCompletionRate: Math.round(jobCompletionRate * 10) / 10,
      weights: DEFAULT_WEIGHTS,
      lastUpdated: Timestamp.now() as any,
    };
  } catch (error) {
    console.error('Error calculating quality score:', error);
    // Return neutral score on error
    return {
      overallScore: 50,
      responseTime: 50,
      timeAccuracy: 50,
      photoEvidenceScore: 50,
      disputeRate: 0,
      specializations: { count: 0, avgRatingPerSpecialty: 0 },
      jobCompletionRate: 0,
      weights: DEFAULT_WEIGHTS,
      lastUpdated: Timestamp.now() as any,
    };
  }
}

/**
 * Save quality score to Firestore.
 * Also denormalizes `qualityScore` and `verifiedSpecialties` onto the main
 * contractor document so the directory listing can sort/display without
 * extra subcollection reads.
 */
export async function saveQualityScore(
  contractorId: string,
  score: QualityScore
): Promise<void> {
  try {
    // Write full score to subcollection
    const scoreRef = adminDb
      .collection('contractors').doc(contractorId)
      .collection('qualityScore').doc('current');
    await scoreRef.set(score as any);

    // Denormalize lightweight fields to main contractor doc for list queries
    await adminDb.collection('contractors').doc(contractorId).set(
      {
        qualityScore:        score.overallScore,
        verifiedSpecialties: score.specializations.count,
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error saving quality score:', error);
  }
}

/**
 * Get quality score for a contractor
 */
export async function getQualityScore(contractorId: string): Promise<QualityScore | null> {
  try {
    const scoreSnap = await adminDb
      .collection('contractors').doc(contractorId)
      .collection('qualityScore').doc('current')
      .get();
    return scoreSnap.exists ? (scoreSnap.data() as QualityScore) : null;
  } catch (error) {
    console.error('Error fetching quality score:', error);
    return null;
  }
}

/**
 * Trigger quality score recalculation
 * Call this after each job completion or review
 */
export async function recalculateQualityScore(
  contractorId: string
): Promise<void> {
  const score = await calculateQualityScore(contractorId);
  await saveQualityScore(contractorId, score);
}
