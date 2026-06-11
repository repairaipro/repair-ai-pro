import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";
import type OpenAI from "openai";

export async function POST(req: Request) {
  const rl = rateLimit(req, "analyze-user", 15);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const { prompt, image } = await req.json();

    const content: OpenAI.ChatCompletionContentPart[] = [
      { type: "text", text: prompt },
    ];

    if (image) {
      content.push({
        type: "image_url",
        image_url: { url: image, detail: "high" },
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    return NextResponse.json({
      output: response.choices[0]?.message?.content || "No response",
    });
  } catch (err: any) {
    const errorMessage = await handleOpenAIError(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
