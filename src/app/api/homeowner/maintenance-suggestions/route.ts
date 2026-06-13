import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

/**
 * GET /api/homeowner/maintenance-suggestions
 *
 * The retention engine. Returns proactive, season-aware maintenance
 * recommendations so homeowners have a reason to open the app when nothing
 * is broken — the structural fix for "people only need a repair twice a year."
 *
 * Deterministic + rule-based (no AI cost): current month × the homeowner's
 * own repair history. Each suggestion carries a prefill description so one
 * tap starts a job.
 *
 * Auth: Bearer token (homeowner)
 */

type Suggestion = {
  id: string;
  title: string;
  why: string;
  trade: string;
  emoji: string;
  priority: "high" | "medium" | "low";
  prefill: string; // → /jobs/new?desc=
  seasonal: boolean;
};

// Northern-hemisphere seasons; tuned for the Houston metro (hot summers, freeze risk)
function seasonForMonth(m: number): "spring" | "summer" | "fall" | "winter" {
  if (m >= 2 && m <= 4) return "spring";   // Mar–May
  if (m >= 5 && m <= 7) return "summer";   // Jun–Aug
  if (m >= 8 && m <= 10) return "fall";    // Sep–Nov
  return "winter";                         // Dec–Feb
}

const SEASONAL: Record<string, Suggestion[]> = {
  spring: [
    { id: "spring-ac", title: "AC tune-up before peak heat", why: "Servicing your AC in spring prevents the #1 summer breakdown — and a clean system runs 5–15% cheaper.", trade: "HVAC", emoji: "❄️", priority: "high", prefill: "Annual AC tune-up and inspection before summer — checking refrigerant, coils, and filter.", seasonal: true },
    { id: "spring-roof", title: "Post-winter roof inspection", why: "Winter storms loosen shingles and flashing. A spring check catches leaks before spring rains find them.", trade: "Roofing", emoji: "🏠", priority: "medium", prefill: "Roof inspection after winter — check for loose or damaged shingles and flashing.", seasonal: true },
    { id: "spring-gutters", title: "Clean gutters & downspouts", why: "Clogged gutters cause foundation and fascia water damage during spring storms.", trade: "Handyman", emoji: "🔨", priority: "low", prefill: "Gutter cleaning and downspout check before spring storm season.", seasonal: true },
  ],
  summer: [
    { id: "summer-ac-filter", title: "Replace AC filters & check airflow", why: "In peak Houston heat your AC runs nearly nonstop. A dirty filter strains the system and spikes your bill.", trade: "HVAC", emoji: "❄️", priority: "high", prefill: "AC not cooling as well as it should — check filter, airflow, and refrigerant level.", seasonal: true },
    { id: "summer-exterior", title: "Exterior paint touch-ups", why: "Summer's dry stretch is the best window for exterior paint to cure properly.", trade: "Painting", emoji: "🎨", priority: "low", prefill: "Exterior paint touch-ups and trim repair while the weather is dry.", seasonal: true },
  ],
  fall: [
    { id: "fall-heating", title: "Heating system check before winter", why: "A pre-winter furnace/heat-pump check prevents the first-cold-night failure when everyone else is calling too.", trade: "HVAC", emoji: "❄️", priority: "high", prefill: "Pre-winter heating system inspection — furnace/heat pump check before the first cold snap.", seasonal: true },
    { id: "fall-gutters", title: "Clear gutters after leaf-fall", why: "Leaf-clogged gutters freeze and back up, damaging your roof edge over winter.", trade: "Handyman", emoji: "🔨", priority: "medium", prefill: "Gutter cleaning after fall leaves before winter.", seasonal: true },
    { id: "fall-weatherstrip", title: "Seal drafts & weatherstripping", why: "Sealing doors and windows now cuts winter heating costs noticeably.", trade: "Handyman", emoji: "🔨", priority: "low", prefill: "Replace weatherstripping and seal drafts around doors and windows before winter.", seasonal: true },
  ],
  winter: [
    { id: "winter-pipes", title: "Freeze-protect your pipes", why: "Texas freezes burst uninsulated pipes — a single burst pipe averages $5,000+ in damage. Insulation is cheap insurance.", trade: "Plumbing", emoji: "🔧", priority: "high", prefill: "Insulate exposed pipes and outdoor faucets to prevent freezing this winter.", seasonal: true },
    { id: "winter-waterheater", title: "Water heater flush & check", why: "Sediment builds up over the year; a winter flush restores efficiency when you need hot water most.", trade: "Plumbing", emoji: "🔧", priority: "medium", prefill: "Water heater flush and inspection — checking for sediment and efficiency.", seasonal: true },
  ],
};

export async function GET(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Pull the homeowner's job history to personalize
    const snap = await adminDb
      .collection("jobs")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const now = Date.now();
    const MS_180_DAYS = 180 * 24 * 60 * 60 * 1000;

    // Track recent trades so we don't suggest what they just did
    const recentTrades = new Set<string>();
    const everTrades = new Set<string>();
    for (const d of snap.docs) {
      const j = d.data();
      const trade = String(j.aiDetectedTrade ?? j.trade ?? "").toLowerCase();
      if (!trade) continue;
      everTrades.add(trade);
      const createdMs = j.createdAt?.toDate?.()?.getTime() ?? 0;
      if (now - createdMs < MS_180_DAYS) recentTrades.add(trade);
    }

    const season = seasonForMonth(new Date().getMonth());
    let suggestions = SEASONAL[season].map((s) => ({ ...s }));

    // Personalization: down-rank a suggestion if they did that trade in the last 6 months
    suggestions = suggestions
      .filter((s) => !recentTrades.has(s.trade.toLowerCase()))
      .map((s) => {
        // First-time homeowners (no history at all) → keep priorities as-is
        return s;
      });

    // History-driven extras (not season-bound)
    const extras: Suggestion[] = [];

    // Recurring trade → preventive inspection
    const tradeCounts: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const t = String(d.data().aiDetectedTrade ?? d.data().trade ?? "").toLowerCase();
      if (t) tradeCounts[t] = (tradeCounts[t] ?? 0) + 1;
    });
    for (const [trade, count] of Object.entries(tradeCounts)) {
      if (count >= 3) {
        extras.push({
          id: `recurring-${trade}`,
          title: `Preventive ${trade} inspection`,
          why: `You've had ${count} ${trade} issues. A preventive inspection often costs less than the next emergency.`,
          trade: trade.charAt(0).toUpperCase() + trade.slice(1),
          emoji: "🔍",
          priority: "medium",
          prefill: `Preventive ${trade} inspection — I've had recurring issues and want to get ahead of the next one.`,
          seasonal: false,
        });
      }
    }

    const all = [...suggestions, ...extras].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    return NextResponse.json({
      success: true,
      season,
      month: new Date().toLocaleString("en-US", { month: "long" }),
      suggestions: all,
      isNewHomeowner: snap.size === 0,
    });
  } catch (err: any) {
    console.error("maintenance-suggestions error:", err);
    return NextResponse.json({ error: "Failed to load suggestions" }, { status: 500 });
  }
}
