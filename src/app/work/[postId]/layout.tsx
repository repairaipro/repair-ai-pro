import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';

/** Per-post share text (the image is supplied by opengraph-image.tsx). */
export async function generateMetadata(
  { params }: { params: { postId: string } }
): Promise<Metadata> {
  try {
    const snap = await adminDb.collection('posts').doc(params.postId).get();
    if (snap.exists) {
      const p = snap.data()!;
      const cSnap = await adminDb.collection('contractors').doc(p.contractorId).get();
      const name = cSnap.data()?.name ?? 'A RepairAI pro';
      const trade = p.trade ?? 'home repair';
      const caption = (p.caption ?? '').slice(0, 140);
      const title = `${name}'s ${trade} work`;
      const description = caption || `See completed ${trade} work by ${name} on RepairAI Pro.`;
      return {
        title,
        description,
        openGraph: { title, description, type: 'article' },
        twitter: { card: 'summary_large_image', title, description },
      };
    }
  } catch { /* fall through */ }
  return { title: 'Work on RepairAI Pro' };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
