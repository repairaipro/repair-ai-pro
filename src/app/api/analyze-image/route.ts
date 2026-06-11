import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";

export async function POST(req: Request) {
  const rl = rateLimit(req, "analyze-image", 15);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or any vision-capable model you use
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "You are a repair and tradesman assistant. Explain what you see in this image and what might be wrong.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    });

    const text = result.choices[0]?.message?.content ?? "No response";
    return NextResponse.json({ analysis: text });
  } catch (err: any) {
    const errorMessage = await handleOpenAIError(err);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
