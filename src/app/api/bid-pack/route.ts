import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

type BidPackRequest = {
  description: string;
  trade: string;
  city: string;
  urgency?: "emergency" | "soon" | "flexible";
  estimate?: {
    price_low_usd?: number;
    price_typical_usd?: number;
    price_high_usd?: number;
    labor_hours_low?: number;
    labor_hours_high?: number;
  } | null;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function bidPackWithOpenAI(payload: any) {
  const systemPrompt = `
You generate contractor-ready bid packs for home repair jobs in the US.
Return JSON only. No markdown. No extra text.
Be clear, practical, and short.
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
  try {
    const decoded = await verifyAuthToken(req).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as BidPackRequest;

    if (!body?.description || !body?.trade || !body?.city) {
      return NextResponse.json(
        { error: "Missing required fields: description, trade, city" },
        { status: 400 }
      );
    }

    const payload = {
      job: {
        description: body.description,
        trade: body.trade,
        city: body.city,
        urgency: body.urgency ?? "flexible",
      },
      estimate_hint: body.estimate ?? null,
      output_schema: {
        bid_pack: {
          title: "string",
          summary: "string (1-2 sentences)",
          scope_of_work: ["string (max 12)"],
          questions_to_confirm: ["string (max 10)"],
          photo_requests: ["string (max 8)"],
          bid_format: ["string (max 6)"],
          safety_or_access_notes: ["string (max 6)"],
        },
      },
      rules: [
        "Scope should be step-by-step and contractor friendly",
        "Questions should reduce price uncertainty",
        "Photo requests should be specific angles/closeups",
        "Bid format should standardize replies (price, timeline, warranty, parts, availability)",
      ],
    };

    const ai = await bidPackWithOpenAI(payload);

    if (!ai?.bid_pack) {
      return NextResponse.json(
        { error: "Bid pack returned invalid output" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bidPack: ai.bid_pack });
  } catch (e: any) {
    const errorMessage = await handleOpenAIError(e);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
