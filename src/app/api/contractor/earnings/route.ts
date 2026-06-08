import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const PLATFORM_FEE = 0.10; // 10% platform cut

type MonthBucket = {
  year: number;
  month: number;
  label: string; // "Jan '26"
  gross: number;
  net: number;
  jobs: number;
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const uid = decoded.uid;

    // Fetch all completed/confirmed jobs claimed by this contractor
    const jobsSnap = await adminDb
      .collection('jobs')
      .where('claimedBy', '==', uid)
      .where('status', 'in', ['completed', 'confirmed', 'cancelled'])
      .orderBy('updatedAt', 'desc')
      .limit(200)
      .get();

    const jobs = jobsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        description: data.description || '',
        trade: data.trade || 'general',
        status: data.status,
        paymentStatus: data.paymentStatus || 'unknown',
        amount: data.paymentAmountUsd || 0,
        isMaintenanceJob: data.isMaintenanceJob || false,
        maintenancePlanTitle: data.maintenancePlanTitle || null,
        confirmedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Only count jobs where payment was actually released
    const paidJobs = jobs.filter(
      (j) => j.status === 'confirmed' && (j.paymentStatus === 'released' || j.paymentStatus === 'transferred')
    );

    const pendingJobs = jobs.filter(
      (j) => j.status === 'completed' && j.amount > 0
    );

    // Total earned (net after platform fee)
    const totalGross = paidJobs.reduce((s, j) => s + j.amount, 0);
    const totalNet = totalGross * (1 - PLATFORM_FEE);
    const totalPending = pendingJobs.reduce((s, j) => s + j.amount * (1 - PLATFORM_FEE), 0);

    // Group by calendar month (last 12 months)
    const now = new Date();
    const monthBuckets: Record<string, MonthBucket> = {};

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthBuckets[key] = {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        gross: 0,
        net: 0,
        jobs: 0,
      };
    }

    for (const job of paidJobs) {
      const date = job.confirmedAt ? new Date(job.confirmedAt) : null;
      if (!date) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthBuckets[key]) {
        monthBuckets[key].gross += job.amount;
        monthBuckets[key].net += job.amount * (1 - PLATFORM_FEE);
        monthBuckets[key].jobs += 1;
      }
    }

    // Current month stats
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonth = monthBuckets[currentKey] || { net: 0, jobs: 0 };

    // Previous month
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonth = monthBuckets[prevKey] || { net: 0, jobs: 0 };

    // Trade breakdown
    const byTrade: Record<string, { gross: number; jobs: number }> = {};
    for (const job of paidJobs) {
      if (!byTrade[job.trade]) byTrade[job.trade] = { gross: 0, jobs: 0 };
      byTrade[job.trade].gross += job.amount;
      byTrade[job.trade].jobs += 1;
    }

    const tradeBreakdown = Object.entries(byTrade)
      .map(([trade, stats]) => ({ trade, ...stats, net: stats.gross * (1 - PLATFORM_FEE) }))
      .sort((a, b) => b.gross - a.gross);

    // Recent 20 paid jobs for the table
    const recentPayouts = paidJobs.slice(0, 20).map((j) => ({
      id: j.id,
      description: j.description,
      trade: j.trade,
      gross: j.amount,
      net: j.amount * (1 - PLATFORM_FEE),
      isMaintenanceJob: j.isMaintenanceJob,
      maintenancePlanTitle: j.maintenancePlanTitle,
      paidAt: j.confirmedAt,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalGross,
        totalNet,
        totalPending,
        totalJobs: paidJobs.length,
        pendingJobs: pendingJobs.length,
        platformFee: PLATFORM_FEE,
        thisMonth: { net: currentMonth.net, jobs: currentMonth.jobs },
        lastMonth: { net: prevMonth.net, jobs: prevMonth.jobs },
      },
      monthlyChart: Object.values(monthBuckets),
      tradeBreakdown,
      recentPayouts,
    });
  } catch (err: any) {
    console.error('Earnings fetch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch earnings' }, { status: 500 });
  }
}
