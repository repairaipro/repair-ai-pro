import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";

export interface Part {
  name: string;
  estimatedPrice: string;
  why: string;
  /** Retailer-optimized search string: brand/model/OEM number/size/fitment when identifiable */
  searchQuery?: string;
  /** OEM or standard part number when one exists, e.g. "Fluidmaster 400A" */
  partNumber?: string;
}

/**
 * Trade-specific guidance on where an expert sources parts and what makes a
 * search land on the exact item. Keeps the model from defaulting to
 * "Home Depot fill valve" for a car. Keys are lowercase trade names; the
 * automotive trades all share the same channel.
 */
const TRADE_SOURCING: Record<string, string> = {
  automotive:
    "Parts come from auto-parts retailers (AutoZone, O'Reilly, RockAuto, Advance Auto). Fitment is everything. " +
    "IF the vehicle year/make/model is provided in the identifying details, include it in every part name and " +
    "searchQuery (with trim/engine when given), e.g. '2018 Toyota Camry 2.5L front CV axle assembly'. " +
    "IF it is NOT provided, do NOT invent a vehicle — name the part generically and add a note in 'why' that fitment " +
    "must be confirmed for the customer's specific vehicle. " +
    "Prefer known aftermarket brands (Cardone, Moog, Dorman, Denso, Bosch, ACDelco); give a part number only when the " +
    "vehicle is known or the part is truly universal.",
  appliance:
    "Parts come from appliance-parts sites that look up by model number (RepairClinic, PartSelect, Amazon). " +
    "IF the appliance brand + model number is provided, put it in every searchQuery, e.g. " +
    "'Whirlpool WRF535SWHZ evaporator fan motor', and give the OEM part number. IF it is NOT provided, do NOT invent a " +
    "model number — name the part generically and note in 'why' that the model number is needed to confirm the exact part.",
  plumbing:
    "Parts come from home/plumbing suppliers (Home Depot, Lowe's, SupplyHouse). Name the dominant brand/model " +
    "and sizes/threads (e.g. 'Fluidmaster 400A fill valve', '3/8-in compression x 1/2-in FIP supply line').",
  hvac:
    "Parts come from HVAC/home suppliers (SupplyHouse, Home Depot). Match the system brand and spec " +
    "(capacitor microfarads/voltage, filter size, motor HP) — put those in the searchQuery.",
  pool_spa:
    "Parts come from pool-supply retailers (Leslie's, Home Depot, Amazon). Name the equipment brand/model " +
    "(pump, filter, heater) and the specific replacement part.",
  general:
    "Parts come from home-improvement retailers (Home Depot, Lowe's, Amazon). Name the dominant brand/model " +
    "and sizes/specs so the search lands on the exact product, not a category page.",
};

const AUTOMOTIVE_TRADES = new Set([
  "auto mechanic",
  "auto body & paint",
  "auto detailing",
  "towing",
  "tire & wheels",
  "auto glass",
]);

function sourcingFor(trade: string): string {
  const t = trade.toLowerCase().trim();
  if (AUTOMOTIVE_TRADES.has(t)) return TRADE_SOURCING.automotive;
  if (t === "appliance repair") return TRADE_SOURCING.appliance;
  if (t === "plumbing") return TRADE_SOURCING.plumbing;
  if (t === "hvac") return TRADE_SOURCING.hvac;
  if (t === "pool & spa") return TRADE_SOURCING.pool_spa;
  return TRADE_SOURCING.general;
}

export async function POST(req: Request) {
  const rl = rateLimit(req, "parts-finder", 20);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const {
      trade,
      description,
      diagnosis,
      details,
      imageUrl,
    } = body as {
      trade?: string;
      description?: string;
      /** The AI's confirmed diagnosis summary — parts must address THIS. */
      diagnosis?: string;
      /** Formatted identifying details: vehicle year/make/model, appliance brand/model, etc. */
      details?: string;
      /** Data-URL of the photo the diagnosis was made from, if any. */
      imageUrl?: string;
    };

    if (!trade || !description) {
      return NextResponse.json({ error: "Missing trade or description" }, { status: 400 });
    }

    // Build the user-message context. The diagnosis anchors the parts to the
    // actual confirmed problem (not just the raw phrase the customer typed),
    // and the identifying details make part numbers/fitment exact.
    const contextLines = [`Trade: ${trade}`];
    if (diagnosis?.trim()) contextLines.push(`Confirmed diagnosis: ${diagnosis.trim()}`);
    contextLines.push(`Customer's description: ${description.trim()}`);
    if (details?.trim()) contextLines.push(`Identifying details:\n${details.trim()}`);
    if (imageUrl) contextLines.push("A photo of the problem is attached — use it to confirm the failed part.");

    const textInstruction =
      `${contextLines.join("\n")}\n\n` +
      `Return a JSON object { "parts": [ ... ] } with 4-6 parts, each DIRECTLY needed to resolve the confirmed ` +
      `diagnosis above (not generic parts for the trade). Each part has this shape:\n` +
      `{ "name": "string (specific — include brand/model and, for vehicles, the year/make/model when provided)", ` +
      `"estimatedPrice": "string like $60–$150", "why": "one sentence tying this part to the diagnosis", ` +
      `"searchQuery": "string optimized so a retailer search lands on the exact fitment/model", ` +
      `"partNumber": "string OEM/standard part number, or empty string if none" }`;

    // Vision-capable message when a photo exists so the model can literally
    // see the failed component; plain text otherwise.
    const userContent: any = imageUrl
      ? [
          { type: "text", text: textInstruction },
          { type: "image_url", image_url: { url: imageUrl } },
        ]
      : textInstruction;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a master parts specialist for the skilled trades. You are given a CONFIRMED diagnosis and must " +
            "list the specific parts required to fix THAT problem — every part must tie back to the diagnosis, never " +
            "generic filler for the trade. Be specific: name the dominant brand and model, include sizes/specs/fitment " +
            "when inferable, and give an OEM or standard part number when one exists. " +
            "NEVER fabricate identifying details (a vehicle year/make/model, an appliance model number, a specific brand) " +
            "that are not present in the input — if they're missing, keep the part generic and say what's needed to " +
            "confirm exact fitment. " +
            sourcingFor(trade) +
            " The searchQuery field is what gets typed into that retailer's search — make it land on the exact product, " +
            'not a category page. Respond with a JSON object of the form { "parts": [ ... ] } and nothing else.',
        },
        { role: "user", content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    // Model is pinned to JSON-object output; read the parts array from it, with
    // a bare-array fallback in case a stray response slips through.
    let parts: Part[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parts = parsed;
      else if (Array.isArray(parsed?.parts)) parts = parsed.parts;
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) { try { parts = JSON.parse(match[0]); } catch { parts = []; } }
    }

    // Validate shape (searchQuery/partNumber are optional enrichments)
    const validated: Part[] = parts
      .filter(
        (p): p is Part =>
          typeof p === "object" &&
          p !== null &&
          typeof p.name === "string" &&
          typeof p.estimatedPrice === "string" &&
          typeof p.why === "string"
      )
      .map((p) => ({
        name: p.name,
        estimatedPrice: p.estimatedPrice,
        why: p.why,
        searchQuery: typeof p.searchQuery === "string" && p.searchQuery.trim() ? p.searchQuery : undefined,
        partNumber: typeof p.partNumber === "string" && p.partNumber.trim() ? p.partNumber : undefined,
      }))
      .slice(0, 6);

    return NextResponse.json({ parts: validated });
  } catch (e: any) {
    const errorMessage = await handleOpenAIError(e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
