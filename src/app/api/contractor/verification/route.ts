import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// GET — contractor checks their own verification status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const uid = decoded.uid;

    const snap = await adminDb
      .collection('contractors')
      .doc(uid)
      .collection('verification')
      .doc('docs')
      .get();

    const contractor = await adminDb.collection('contractors').doc(uid).get();
    const cData = contractor.data() || {};

    return NextResponse.json({
      success: true,
      status: cData.verificationStatus || 'unverified',
      licenseVerified: cData.licenseVerified || false,
      insuranceVerified: cData.insuranceVerified || false,
      verifiedAt: cData.verifiedAt?.toDate?.()?.toISOString() || null,
      insuranceExpiresAt: cData.insuranceExpiresAt?.toDate?.()?.toISOString() || null,
      docs: snap.exists ? {
        ...snap.data(),
        submittedAt: snap.data()?.submittedAt?.toDate?.()?.toISOString() || null,
        reviewedAt: snap.data()?.reviewedAt?.toDate?.()?.toISOString() || null,
      } : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — contractor submits verification documents
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const uid = decoded.uid;

    const body = await request.json() as {
      licenseDocUrl?: string;
      insuranceDocUrl?: string;
      licenseNumber?: string;
      licenseState?: string;
      licenseType?: string;
      insuranceProvider?: string;
      insuranceExpiry?: string; // YYYY-MM
      insurancePolicyNumber?: string;
      coverageAmountUsd?: number;
    };

    if (!body.licenseDocUrl && !body.insuranceDocUrl) {
      return NextResponse.json({ error: 'At least one document is required' }, { status: 400 });
    }

    const contractorRef = adminDb.collection('contractors').doc(uid);
    const verificationRef = contractorRef.collection('verification').doc('docs');

    // Build the verification submission
    const submission: Record<string, any> = {
      submittedAt: FieldValue.serverTimestamp(),
      status: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    };

    if (body.licenseDocUrl) {
      submission.licenseDocUrl = body.licenseDocUrl;
      submission.licenseNumber = body.licenseNumber || null;
      submission.licenseState = body.licenseState || null;
      submission.licenseType = body.licenseType || null;
    }

    if (body.insuranceDocUrl) {
      submission.insuranceDocUrl = body.insuranceDocUrl;
      submission.insuranceProvider = body.insuranceProvider || null;
      submission.insurancePolicyNumber = body.insurancePolicyNumber || null;
      submission.coverageAmountUsd = body.coverageAmountUsd || null;

      if (body.insuranceExpiry) {
        const [year, month] = body.insuranceExpiry.split('-').map(Number);
        submission.insuranceExpiry = body.insuranceExpiry;
        // Store as timestamp (end of that month)
        submission.insuranceExpiresAt = new Date(year, month, 0); // last day of month
      }
    }

    await verificationRef.set(submission, { merge: true });

    // Mark contractor as pending
    await contractorRef.set({
      verificationStatus: 'pending',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Create an admin notification doc for review queue
    await adminDb.collection('adminTasks').add({
      type: 'contractor_verification',
      contractorId: uid,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      hasLicense: !!body.licenseDocUrl,
      hasInsurance: !!body.insuranceDocUrl,
    });

    return NextResponse.json({ success: true, status: 'pending' });
  } catch (err: any) {
    console.error('Verification submit error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
