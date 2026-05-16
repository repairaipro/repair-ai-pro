import { NextResponse } from "next/server";

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  billingPeriod: 'monthly' | 'annual';
  userType: 'contractor' | 'homeowner';
  features: string[];
  limits: Record<string, number | string | boolean>;
  badge?: string;
  recommended?: boolean;
}

const CONTRACTOR_PLANS: SubscriptionPlan[] = [
  {
    id: 'contractor_free',
    name: 'Free Tier',
    displayName: 'Starter',
    price: 0,
    billingPeriod: 'monthly',
    userType: 'contractor',
    features: [
      'Unlimited job applications',
      'Basic profile',
      'Email notifications',
      '12% platform fee',
    ],
    limits: {
      'featured_profile_months': 0,
      'featured_placement': false,
      'priority_matching': false,
    },
  },
  {
    id: 'contractor_pro',
    name: 'Pro Tier',
    displayName: 'Pro',
    price: 1999, // $19.99/month
    billingPeriod: 'monthly',
    userType: 'contractor',
    features: [
      'All Starter features',
      'Featured profile badge',
      'Priority job matching',
      'Verified badge',
      '10% platform fee',
      'Response time guarantee',
    ],
    limits: {
      'featured_profile_months': 1,
      'featured_placement': true,
      'priority_matching': true,
    },
    recommended: true,
  },
  {
    id: 'contractor_elite',
    name: 'Elite Tier',
    displayName: 'Elite',
    price: 4999, // $49.99/month
    billingPeriod: 'monthly',
    userType: 'contractor',
    features: [
      'All Pro features',
      'Premium profile placement',
      'Dedicated support',
      'Emergency early access to jobs',
      '0% platform fee on first 3 jobs/month',
      'Analytics dashboard',
    ],
    limits: {
      'featured_profile_months': 3,
      'featured_placement': true,
      'priority_matching': true,
    },
    badge: 'Elite Partner',
  },
];

const HOMEOWNER_PLANS: SubscriptionPlan[] = [
  {
    id: 'homeowner_free',
    name: 'Free Tier',
    displayName: 'Free',
    price: 0,
    billingPeriod: 'monthly',
    userType: 'homeowner',
    features: [
      'Unlimited job postings',
      'Standard contractor matching',
      'Email notifications',
      'Basic profile',
    ],
    limits: {
      'featured_listings': 0,
      'priority_contractor_matching': false,
      'early_access': false,
    },
  },
  {
    id: 'homeowner_pro',
    name: 'Pro Tier',
    displayName: 'Pro',
    price: 999, // $9.99/month
    billingPeriod: 'monthly',
    userType: 'homeowner',
    features: [
      'All Free features',
      'Featured job listings',
      'Priority contractor matching',
      'Discounted rates from Pro contractors',
      'Advanced search filters',
    ],
    limits: {
      'featured_listings': 1,
      'priority_contractor_matching': true,
      'early_access': false,
    },
    recommended: true,
  },
];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userType = url.searchParams.get("type") as 'contractor' | 'homeowner';

    const plans = userType === 'contractor' ? CONTRACTOR_PLANS : HOMEOWNER_PLANS;

    return NextResponse.json({
      plans,
      currency: 'USD',
      message: 'Subscription plans available for both monthly and annual billing',
    });
  } catch (err: any) {
    console.error("get plans error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
