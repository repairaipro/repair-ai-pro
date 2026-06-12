import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { trackEvent, type FunnelEvent } from "@/lib/funnel";

/** Client-originated events must come from this whitelist */
const CLIENT_EVENTS: FunnelEvent[] = ["diagnosis_run"];

/**
 * POST /api/track  { type: "diagnosis_run", meta?: {...} }
 * Public, rate-limited, whitelisted — top-of-funnel events only.
 * Everything past job creation is tracked server-side in the routes themselves.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "track", 60);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const type = body?.type as FunnelEvent;
    if (!CLIENT_EVENTS.includes(type)) {
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }
    // Cap meta size so this can't be used as a write amplifier
    const meta = typeof body?.meta === "object" && body.meta !== null
      ? JSON.parse(JSON.stringify(body.meta).slice(0, 500))
      : {};
    trackEvent(type, meta);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // analytics never errors user-facing
  }
}
