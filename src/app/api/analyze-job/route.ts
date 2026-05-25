// src/app/api/analyze-job/route.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY on server" }),
        { status: 500 }
      );
    }

    const { jobId, imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl in request body" }),
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
    const response = await client.chat.completions.create({
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

    return Response.json({ summary });
  } catch (err: any) {
    console.error("analyze-job error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to analyze job", detail: err.message }),
      { status: 500 }
    );
  }
}
