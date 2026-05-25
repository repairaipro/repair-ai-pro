import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";

export interface Part {
  name: string;
  estimatedPrice: string;
  why: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trade, description } = body as { trade?: string; description?: string };

    if (!trade || !description) {
      return NextResponse.json({ error: "Missing trade or description" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a repair parts expert. Given a trade and repair description, list the most likely parts needed. Return ONLY valid JSON array with no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Trade: ${trade}\nDescription: ${description}\n\nReturn a JSON array of 4-6 parts in this exact shape:\n[{ "name": "string", "estimatedPrice": "string like $12–$25", "why": "one sentence reason" }]`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";

    let parts: Part[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) parts = JSON.parse(match[0]);
    } catch {
      parts = [];
    }

    // Validate shape
    const validated: Part[] = parts
      .filter(
        (p): p is Part =>
          typeof p === "object" &&
          p !== null &&
          typeof p.name === "string" &&
          typeof p.estimatedPrice === "string" &&
          typeof p.why === "string"
      )
      .slice(0, 6);

    return NextResponse.json({ parts: validated });
  } catch (e: any) {
    const errorMessage = await handleOpenAIError(e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
