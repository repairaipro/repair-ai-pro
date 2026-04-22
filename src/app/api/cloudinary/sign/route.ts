import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAuthToken } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  const decoded = await verifyAuthToken(req).catch(() => null);
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'repair-ai/uploads';

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary env not set' }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

  return NextResponse.json({ signature, timestamp, apiKey, cloudName, folder });
}
