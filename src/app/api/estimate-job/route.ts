import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

type EstimateRequest = {
  description: string;
  trade: string;
  city: string;
  urgency?: "emergency" | "soon" | "flexible";
};

async function estimateWithOpenAI(payload: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const system = `
You are an AI estimator for skilled service jobs in the United States (home repair, automotive, tech support, moving, and more).
Return JSON only. No markdown. No extra text.
Be conservative: give a low/typical/high range.
If uncertain, widen the range and ask clarifying questions.
Avoid making up local permit requirements; flag them as "may apply".
`.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
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

    const body = (await req.json()) as EstimateRequest;

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
      output_schema: {
        estimate: {
          price_low_usd: "number",
          price_typical_usd: "number",
          price_high_usd: "number",
          labor_hours_low: "number",
          labor_hours_high: "number",
          materials_allowance_usd: "number",
          why_this_range: "string (2-4 sentences)",
          questions_to_confirm: ["string (max 8)"],
          scope_of_work: ["string (step-by-step bullets, max 12)"],
          risk_factors: ["string (max 6)"],
        },
      },
      rules: [
        "Use typical US residential service pricing logic",
        "Consider trip/service call fees",
        "Emergency work increases cost",
        "If the job could be simple or severe, widen the range and ask questions",
        "Keep it practical and contractor-friendly",
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
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
