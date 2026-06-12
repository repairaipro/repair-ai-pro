import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";

type LocationData = {
  zipcode?: string;
  city?: string;
  state?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
};

type EstimateRequest = {
  description: string;
  trade: string;
  location?: LocationData;
  city?: string;
  urgency?: "emergency" | "soon" | "flexible";
};

function formatLocation(location?: LocationData | string): string {
  if (!location) return "Unknown location";
  if (typeof location === "string") return location;

  if (location.zipcode) return `ZIP ${location.zipcode}`;
  if (location.address) return location.address;
  if (location.city && location.state) return `${location.city}, ${location.state}`;
  return "Unknown location";
}

async function estimateWithOpenAI(payload: any) {
  const systemPrompt = `
You are a pricing expert for skilled service jobs in the United States.
Your estimates must be based on actual labor rates, materials costs, and regional variations.

Pricing guidelines:
- Labor: Typically $50-150/hour depending on trade (plumbing/electrical higher, general repairs lower)
- Materials: Research common parts and their actual costs
- Regional multipliers: Texas/Ohio ~0.9x, California ~1.2x, urban ~1.1x, rural ~0.9x
- Emergency/urgent: +50% for same-day service
- DIY assumes average homeowner competence; pro assumes licensed/insured contractor

Return JSON only. No markdown. No extra text.
Narrow the range as much as possible given the description.
If multiple scenarios are possible, pick the most likely and list others in risk_factors.
Always explain your reasoning in why_this_range.
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return JSON.parse(content);
}

export async function POST(req: Request) {
  const rl = rateLimit(req, "estimate-job", 20);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const body = (await req.json()) as EstimateRequest;

    if (!body?.description || !body?.trade) {
      return NextResponse.json(
        { error: "Missing required fields: description, trade" },
        { status: 400 }
      );
    }

    const location = body.location || (body.city ? { city: body.city } : undefined);
    if (!location) {
      return NextResponse.json(
        { error: "Missing required fields: location or city" },
        { status: 400 }
      );
    }

    const locationStr = formatLocation(location);

    const payload = {
      job: {
        description: body.description,
        trade: body.trade,
        location: locationStr,
        urgency: body.urgency ?? "flexible",
      },
      output_schema: {
        estimate: {
          price_low_usd: "number (DIY approach, best case)",
          price_typical_usd: "number (most likely professional cost)",
          price_high_usd: "number (pro approach, complications included)",
          labor_hours_low: "number",
          labor_hours_high: "number",
          labor_rate_assumption: "string (e.g. '$75/hr for this trade in this region')",
          materials_breakdown: "string (e.g. 'Parts $150-200, supplies $30')",
          why_this_range: "string (explain low/typical/high assumptions)",
          questions_to_confirm: ["string (critical questions that would narrow the range, max 5)"],
          scope_of_work: ["string (step-by-step, max 10)"],
          risk_factors: ["string (complications that would increase cost, max 5)"],
          diy_feasibility: "string ('Easy', 'Moderate', 'Difficult', 'Not recommended')",
        },
      },
      rules: [
        "Be specific: don't give $100-5000 ranges. Make educated guesses about likelihood",
        "Typical cases get a 25-40% range (low to high), not 100%+",
        "Service call fee: add $50-100 for first-time visit in most trades",
        "List specific materials with costs, not vague 'parts'",
        "Emergency/urgent adds 50%; after-hours adds 75%",
        "If truly multiple scenarios possible, pick most likely and list alternatives in risk_factors",
        "DIY cost assumes homeowner already owns basic tools",
        "Professional assumes licensed, insured contractor in a typical metro area",
      ],
    };

    const ai = await estimateWithOpenAI(payload);

    // Expect { estimate: {...} }
    if (!ai?.estimate) {
      return NextResponse.json(
        { error: "Estimator returned invalid output" },
        { status: 500 }
      );
    }

    return NextResponse.json({ estimate: ai.estimate });
  } catch (e: any) {
    const errorMessage = await handleOpenAIError(e);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
