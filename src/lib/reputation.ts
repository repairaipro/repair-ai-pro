import {
  collectionGroup,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/db";

export type Reputation = {
  avgRating: number;
  totalReviews: number;
  disputes: number;
  badge: "new" | "top_rated" | "needs_improvement" | "under_review";
};

const DISPUTE_PENALTIES: Record<string, number> = {
  contractor_fault: 0.5,
  mutual: 0.2,
};

export async function getContractorReputation(
  contractorId: string
): Promise<Reputation> {
  /* ---------- REVIEWS ---------- */
  const reviewsQ = query(
    collectionGroup(db, "reviews"),
    where("contractorId", "==", contractorId)
  );

  const reviewsSnap = await getDocs(reviewsQ);

  let totalRating = 0;
  reviewsSnap.forEach((d) => {
    const r = d.data().rating;
    if (typeof r === "number") totalRating += r;
  });

  const totalReviews = reviewsSnap.size;
  const baseAvg =
    totalReviews > 0 ? Number((totalRating / totalReviews).toFixed(2)) : 0;

  /* ---------- DISPUTES ---------- */
  const disputesQ = query(
    collectionGroup(db, "disputes"),
    where("createdBy", "!=", null)
  );

  const disputesSnap = await getDocs(disputesQ);

  let penalty = 0;
  let disputeCount = 0;
  let unresolvedOld = false;

  disputesSnap.forEach((d) => {
    const data = d.data();
    if (data.resolution && DISPUTE_PENALTIES[data.resolution]) {
      penalty += DISPUTE_PENALTIES[data.resolution];
      disputeCount++;
    }

    if (
      data.status === "open" &&
      data.createdAt instanceof Timestamp &&
      Date.now() - data.createdAt.toMillis() > 7 * 24 * 60 * 60 * 1000
    ) {
      unresolvedOld = true;
    }
  });

  const adjustedAvg = Math.max(0, Number((baseAvg - penalty).toFixed(2)));

  /* ---------- BADGE ---------- */
  let badge: Reputation["badge"] = "new";

  if (unresolvedOld) badge = "under_review";
  else if (totalReviews >= 5 && adjustedAvg >= 4.5) badge = "top_rated";
  else if (adjustedAvg > 0 && adjustedAvg < 3) badge = "needs_improvement";

  return {
    avgRating: adjustedAvg,
    totalReviews,
    disputes: disputeCount,
    badge,
  };
}