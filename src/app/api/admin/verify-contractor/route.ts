import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').map((s) => s.trim()).filter(Boolean);

// POST — admin approves or rejects a contractor's verification
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const adminUid = decoded.uid;

    if (ADMIN_UIDS.length > 0 && !ADMIN_UIDS.includes(adminUid)) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await request.json() as {
      contractorId: string;
      action: 'approve_license' | 'approve_insurance' | 'approve_all' | 'reject';
      rejectionReason?: string;
    };

    if (!body.contractorId || !body.action) {
      return NextResponse.json({ error: 'Missing contractorId or action' }, { status: 400 });
    }

    const contractorRef = adminDb.collection('contractors').doc(body.contractorId);
    const verificationRef = contractorRef.collection('verification').doc('docs');

    const now = FieldValue.serverTimestamp();

    if (body.action === 'reject') {
      await verificationRef.update({
        status: 'rejected',
        rejectionReason: body.rejectionReason || 'Documents could not be verified.',
        reviewedAt: now,
        reviewedBy: adminUid,
      });
      await contractorRef.set({
        verificationStatus: 'rejected',
        licenseVerified: false,
        insuranceVerified: false,
        updatedAt: now,
      }, { merge: true });

    } else {
      const licenseApproved = body.action === 'approve_license' || body.action === 'approve_all';
      const insuranceApproved = body.action === 'approve_insurance' || body.action === 'approve_all';

      // Fetch current doc to merge partial approvals
      const verSnap = await verificationRef.get();
      const verData = verSnap.data() || {};

      const newLicense = licenseApproved ? true : (verData.licenseApproved || false);
      const newInsurance = insuranceApproved ? true : (verData.insuranceApproved || false);
      const fullyVerified = newLicense && newInsurance;

      await verificationRef.update({
        status: fullyVerified ? 'verified' : 'partial',
        licenseApproved: newLicense,
        insuranceApproved: newInsurance,
        reviewedAt: now,
        reviewedBy: adminUid,
      });

      const contractorUpdate: Record<string, any> = {
        licenseVerified: newLicense,
        insuranceVerified: newInsurance,
        verificationStatus: fullyVerified ? 'verified' : 'pending',
        updatedAt: now,
      };

      if (fullyVerified) {
        contractorUpdate.verifiedAt = now;
        contractorUpdate.verificationBadge = true;
      }

      // Copy insurance expiry to top-level for easy querying
      if (insuranceApproved && verData.insuranceExpiresAt) {
        contractorUpdate.insuranceExpiresAt = verData.insuranceExpiresAt;
      }

      await contractorRef.set(contractorUpdate, { merge: true });
    }

    // Mark admin task as complete
    const tasksSnap = await adminDb
      .collection('adminTasks')
      .where('contractorId', '==', body.contractorId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!tasksSnap.empty) {
      await tasksSnap.docs[0].ref.update({ status: 'reviewed', reviewedAt: now });
    }

    return NextResponse.json({ success: true, action: body.action });
  } catch (err: any) {
    console.error('Admin verify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — admin fetches pending verification queue
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const adminUid = decoded.uid;

    if (ADMIN_UIDS.length > 0 && !ADMIN_UIDS.includes(adminUid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tasksSnap = await adminDb
      .collection('adminTasks')
      .where('type', '==', 'contractor_verification')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const tasks = await Promise.all(tasksSnap.docs.map(async (d) => {
      const task = d.data();
      const contractorSnap = await adminDb.collection('contractors').doc(task.contractorId).get();
      const contractor = contractorSnap.data() || {};
      const verSnap = await adminDb
        .collection('contractors')
        .doc(task.contractorId)
        .collection('verification')
        .doc('docs')
        .get();

      return {
        taskId: d.id,
        contractorId: task.contractorId,
        contractorName: contractor.name || 'Unknown',
        contractorTrade: contractor.trade || '',
        contractorEmail: contractor.email || '',
        submittedAt: task.createdAt?.toDate?.()?.toISOString() || null,
        hasLicense: task.hasLicense || false,
        hasInsurance: task.hasInsurance || false,
        docs: verSnap.exists ? verSnap.data() : null,
      };
    }));

    return NextResponse.json({ success: true, tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
