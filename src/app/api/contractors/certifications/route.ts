import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

interface Certification {
  id?: string;
  type: 'license' | 'insurance' | 'certification' | 'training';
  name: string;
  issuer?: string;
  expirationDate?: string;
  verified?: boolean;
  certificateUrl?: string;
  uploadedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const body: Certification = await request.json();

    // Validate required fields
    if (!body.type || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['license', 'insurance', 'certification', 'training'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Add timestamps and ID
    const cert: Certification = {
      ...body,
      id: `${body.type}-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };

    // Add certification to contractor's certifications array
    const contractorRef = adminDb.collection('contractors').doc(uid);
    const contractorDoc = await contractorRef.get();
    const certs = (contractorDoc.data()?.certifications as any[]) || [];

    await contractorRef.update({
      certifications: [...certs, cert],
      updatedAt: new Date(),
    });

    return NextResponse.json(cert);
  } catch (error) {
    console.error('Error adding certification:', error);
    return NextResponse.json(
      { error: 'Failed to add certification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const { certId } = await request.json();

    if (!certId) {
      return NextResponse.json(
        { error: 'Missing certId' },
        { status: 400 }
      );
    }

    // Get the contractor's current certifications
    const contractorRef = adminDb.collection('contractors').doc(uid);
    const contractorDoc = await contractorRef.get();
    const contractorData = contractorDoc.data();
    const certs = contractorData?.certifications || [];

    // Find and remove the certification
    const certToRemove = certs.find((c: any) => c.id === certId);
    if (!certToRemove) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    await contractorRef.update({
      certifications: certs.filter((c: any) => c.id !== certId),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting certification:', error);
    return NextResponse.json(
      { error: 'Failed to delete certification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const { certId, updates }: { certId: string; updates: Partial<Certification> } = await request.json();

    if (!certId) {
      return NextResponse.json(
        { error: 'Missing certId' },
        { status: 400 }
      );
    }

    // Get the contractor's current certifications
    const contractorRef = adminDb.collection('contractors').doc(uid);
    const contractorDoc = await contractorRef.get();
    const contractorData = contractorDoc.data();
    const certs = contractorData?.certifications || [];

    // Find, update, and replace the certification
    const certIndex = certs.findIndex((c: any) => c.id === certId);
    if (certIndex === -1) {
      return NextResponse.json(
        { error: 'Certification not found' },
        { status: 404 }
      );
    }

    const oldCert = certs[certIndex];
    const updatedCert = {
      ...oldCert,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Update: replace in array
    const newCerts = certs.map((c: any) => c.id === certId ? updatedCert : c);
    await contractorRef.update({
      certifications: newCerts,
      updatedAt: new Date(),
    });

    return NextResponse.json(updatedCert);
  } catch (error) {
    console.error('Error updating certification:', error);
    return NextResponse.json(
      { error: 'Failed to update certification' },
      { status: 500 }
    );
  }
}
