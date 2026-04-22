import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type ExplainMode = "beginner" | "homeowner" | "pro";

function buildSystemPrompt(mode?: ExplainMode) {
  const base = `You are RepairGPT — a friendly, highly skilled home repair AI.
You analyze images, diagnose problems, and guide customers with clear instructions.
Always give clear next steps and safety considerations.
If no repair issue is found, suggest relevant maintenance advice.`;

  if (mode === "beginner") {
    return `${base}\nExplain like the user is a total beginner DIY homeowner. Avoid jargon, use plain language, and give step-by-step guidance.`;
  }
  if (mode === "pro") {
    return `${base}\nExplain for a professional technician. Use technical language, mention likely failure modes, tools, and relevant standards where appropriate.`;
  }
  // default: "homeowner"
  return `${base}\nExplain for a typical homeowner with some common-sense understanding. Use simple technical terms but always define them.`;
}

export async function POST(req: Request) {
  try {
    const { message, imageUrl, jobId, mode } = await req.json();

    const content: { type: string; text?: string; image_url?: string; detail?: string }[] = [];

    if (message && String(message).trim().length > 0) {
      content.push({ type: "input_text", text: String(message) });
    }

    if (imageUrl) {
      content.push({ type: "input_image", image_url: imageUrl, detail: "high" });
    }

    if (content.length === 0) {
      return NextResponse.json({ error: "No message or image provided" }, { status: 400 });
    }

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: buildSystemPrompt(mode as ExplainMode) },
        { role: "user", content: content as any },
      ],
    });

    const reply = response.output_text || "Something went wrong — no output received.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("AI Chat Error:", error.message);
    return NextResponse.json({ error: error.message || "Unknown server error" }, { status: 500 });
  }
}
