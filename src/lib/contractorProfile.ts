import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/db";

export type ContractorProfile = {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  trade?: string;
  city?: string;
  bio?: string;
  photoURL?: string;
  rating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
  jobsAccepted?: number;
  responseCount?: number;
  invitationAcceptCount?: number;
  invitationDeclineCount?: number;
  lastActiveAt?: any;
  createdAt?: any;
  updatedAt?: any;
  // Stripe Connect for payouts
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete?: boolean;
  stripeConnectVerified?: boolean;
};

export async function ensureContractorProfile(
  uid: string,
  data: Partial<ContractorProfile> = {}
) {
  const ref = doc(db, "contractors", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        uid,
        rating: 0,
        reviewCount: 0,
        jobsCompleted: 0,
        jobsAccepted: 0,
        responseCount: 0,
        invitationAcceptCount: 0,
        invitationDeclineCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        ...data,
      },
      { merge: true }
    );
    return;
  }

  await updateDoc(ref, {
    ...data,
    lastActiveAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function bumpContractorAccepted(uid: string) {
  const ref = doc(db, "contractors", uid);
  await setDoc(
    ref,
    {
      uid,
      jobsAccepted: increment(1),
      invitationAcceptCount: increment(1),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function bumpContractorDeclined(uid: string) {
  const ref = doc(db, "contractors", uid);
  await setDoc(
    ref,
    {
      uid,
      invitationDeclineCount: increment(1),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function bumpContractorCompleted(uid: string) {
  const ref = doc(db, "contractors", uid);
  await setDoc(
    ref,
    {
      uid,
      jobsCompleted: increment(1),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateContractorRating(
  uid: string,
  nextAverage: number,
  nextReviewCount: number
) {
  const ref = doc(db, "contractors", uid);
  await setDoc(
    ref,
    {
      uid,
      rating: Number(nextAverage.toFixed(2)),
      reviewCount: nextReviewCount,
      updatedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    },
    { merge: true }
  );
}