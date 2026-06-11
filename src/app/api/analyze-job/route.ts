import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
// src/app/api/analyze-job/route.ts
import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";

export async function POST(req: Request) {
  const rl = rateLimit(req, "analyze-job", 20);
  if (!rl.ok) return rateLimitResponse(rl);

  try {

    const { jobId, imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing imageUrl in request body" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert tradesman helping analyze a repair job from a photo.

Job ID: ${jobId || "unknown"}

1) Describe what you see in the image.
2) List the most likely problem(s).
3) List the suggested fix steps.
4) Mention urgency (low / medium / high).
Keep it clear and under 250 words.`;

    // Standard Chat Completions API with vision support
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const summary =
      response.choices[0]?.message?.content ?? "No analysis returned.";

    return NextResponse.json({ summary });
  } catch (err: any) {
    const errorMessage = await handleOpenAIError(err);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
