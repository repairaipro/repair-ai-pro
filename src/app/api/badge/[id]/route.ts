import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const revalidate = 3600; // badge can be cached for an hour

/**
 * GET /api/badge/[id]
 *
 * Embeddable SVG badge for a contractor's own website:
 *   <a href="https://.../contractor/ID"><img src="https://.../api/badge/ID" /></a>
 *
 * Distribution loop: every embedded badge is a backlink + referral surface.
 */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const snap = await adminDb.collection("contractors").doc(params.id).get();
    if (!snap.exists) {
      return new NextResponse("Not found", { status: 404 });
    }

    const c = snap.data()!;
    const name = esc(String(c.name ?? "Verified Contractor").slice(0, 28));
    const rating = Number(c.avgRating ?? c.rating ?? 0);
    const reviews = Number(c.reviewCount ?? 0);
    const verified = c.verificationStatus === "verified";

    const ratingLine = rating > 0
      ? `★ ${rating.toFixed(1)} · ${reviews} review${reviews === 1 ? "" : "s"}`
      : "Profile on RepairAI Pro";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="64" viewBox="0 0 260 64" role="img" aria-label="${name} — verified on RepairAI Pro">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="260" height="64" rx="12" fill="#0f1117" stroke="#2a2d3a" stroke-width="1"/>
  <rect x="10" y="14" width="36" height="36" rx="10" fill="url(#g)"/>
  <text x="28" y="38" font-family="system-ui,Segoe UI,sans-serif" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">⚡</text>
  <text x="56" y="27" font-family="system-ui,Segoe UI,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${name}</text>
  <text x="56" y="44" font-family="system-ui,Segoe UI,sans-serif" font-size="11" fill="#fbbf24">${esc(ratingLine)}</text>
  ${verified ? `<g><rect x="196" y="10" width="56" height="16" rx="8" fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.4)" stroke-width="0.5"/><text x="224" y="21.5" font-family="system-ui,Segoe UI,sans-serif" font-size="9" font-weight="700" fill="#22c55e" text-anchor="middle">VERIFIED</text></g>` : ""}
  <text x="56" y="57" font-family="system-ui,Segoe UI,sans-serif" font-size="8.5" fill="#6b7280">repairaipro.com</text>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("Badge error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
