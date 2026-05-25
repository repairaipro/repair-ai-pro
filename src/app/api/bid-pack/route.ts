import { NextResponse } from "next/server";
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

async function bidPackWithOpenAI(payload: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const system = `
You generate contractor-ready bid packs for home repair jobs in the US.
Return JSON only. No markdown. No extra text.
Be clear, practical, and short.
`.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
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
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
