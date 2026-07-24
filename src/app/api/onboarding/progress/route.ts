import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium';
  reward?: number; // Credits awarded on completion
}

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const url = new URL(req.url);
    const userType = url.searchParams.get("type") || "contractor";

    const userDoc = await adminDb
      .collection(userType === 'contractor' ? 'contractors' : 'homeowners')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userDoc.data() as any;

    // Define onboarding tasks based on user type
    const tasks: OnboardingTask[] = userType === 'contractor'
      ? [
          {
            id: 'complete_profile',
            title: 'Complete Your Profile',
            description: 'Add profile photo, trades, and service areas',
            completed: !!user.profilePhotoUrl && user.trades && user.trades.length > 0,
            priority: 'critical',
            reward: 500,
          },
          {
            id: 'add_portfolio',
            title: 'Add Portfolio Images',
            description: 'Upload before/after photos of your work',
            completed: (user.portfolioImages?.length ?? 0) >= 3,
            priority: 'high',
            reward: 300,
          },
          {
            id: 'add_certifications',
            title: 'Upload Certifications',
            description: 'Add licenses, insurance, or training certificates',
            completed: (user.certifications?.length ?? 0) >= 1,
            priority: 'high',
            reward: 300,
          },
          {
            id: 'connect_bank',
            title: 'Connect Bank Account',
            description: 'Set up Stripe Connect for payouts',
            completed: user.stripeConnectId || user.bankAccountVerified,
            priority: 'critical',
            reward: 1000,
          },
          {
            id: 'set_availability',
            title: 'Set Your Availability',
            description: 'Configure working hours and service radius',
            completed: !!user.serviceRadius || !!user.workingHours,
            priority: 'medium',
            reward: 200,
          },
          {
            id: 'bid_on_job',
            title: 'Bid on Your First Job',
            description: 'Accept or bid on a job to start earning',
            completed: (user.jobsAccepted ?? 0) >= 1,
            priority: 'critical',
            reward: 2000,
          },
        ]
      : [
          {
            id: 'complete_profile',
            title: 'Complete Your Profile',
            description: 'Add photo and verify your identity',
            completed: !!user.profilePhotoUrl && user.emailVerified,
            priority: 'critical',
            reward: 300,
          },
          {
            id: 'verify_phone',
            title: 'Verify Phone Number',
            description: 'Add a verified phone for better contractor communication',
            completed: user.phoneVerified,
            priority: 'high',
            reward: 200,
          },
          {
            id: 'post_job',
            title: 'Post Your First Job',
            description: 'Create a job to connect with contractors',
            completed: (user.jobsPosted ?? 0) >= 1,
            priority: 'critical',
            reward: 1000,
          },
          {
            id: 'hire_contractor',
            title: 'Hire a Contractor',
            description: 'Accept a bid and hire someone for your job',
            completed: (user.jobsHired ?? 0) >= 1,
            priority: 'critical',
            reward: 500,
          },
          {
            id: 'leave_review',
            title: 'Leave a Review',
            description: 'Rate and review your contractor experience',
            completed: (user.reviewsLeft ?? 0) >= 1,
            priority: 'medium',
            reward: 300,
          },
        ];

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalReward = tasks
      .filter((t) => t.completed && t.reward)
      .reduce((sum, t) => sum + (t.reward || 0), 0);

    return NextResponse.json({
      userType,
      tasks,
      progress: {
        completed: completedCount,
        total: tasks.length,
        percentage: Math.round((completedCount / tasks.length) * 100),
      },
      rewards: {
        earned: totalReward,
        total: tasks.reduce((sum, t) => sum + (t.reward || 0), 0),
      },
      completedTasks: tasks.filter((t) => t.completed).map((t) => t.id),
    });
  } catch (err: any) {
    console.error("onboarding progress error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
