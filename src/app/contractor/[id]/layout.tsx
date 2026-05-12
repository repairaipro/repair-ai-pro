import type { Metadata } from "next";
import { adminDb } from "@/lib/firebaseAdmin";

/** Generate SEO metadata per contractor for Google indexing */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const snap = await adminDb.collection("contractors").doc(params.id).get();
    if (!snap.exists) {
      return { title: "Contractor Profile | RepairAI Pro" };
    }

    const c = snap.data() as any;
    const name   = c.name        ?? "Professional Contractor";
    const trade  = c.trade       ?? "General Contractor";
    const city   = c.city        ?? "";
    const rating = c.avgRating   ?? null;
    const jobs   = c.jobsCompleted ?? 0;

    const title       = `${name} — ${trade}${city ? ` in ${city}` : ""} | RepairAI Pro`;
    const description = `Hire ${name}, a verified ${trade}${city ? ` in ${city}` : ""}.${rating ? ` ⭐ ${rating.toFixed(1)} rating.` : ""} ${jobs} jobs completed. Secure escrow payments, AI-matched, instant booking.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type:   "profile",
        images: c.photoUrl ? [{ url: c.photoUrl, width: 400, height: 400 }] : [],
      },
      twitter: {
        card:        "summary",
        title,
        description,
        images:      c.photoUrl ? [c.photoUrl] : [],
      },
    };
  } catch {
    return { title: "Contractor Profile | RepairAI Pro" };
  }
}

export default function ContractorProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
