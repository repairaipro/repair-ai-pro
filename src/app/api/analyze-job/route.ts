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

    const prompt = `
You are an expert tradesman helping analyze a repair job from a photo.

Job ID: ${jobId || "unknown"}

1) Describe what you see in the image.
2) List the most likely problem(s).
3) List the suggested fix steps.
4) Mention urgency (low / medium / high).
Keep it clear and under 250 words.
`.trim();

    // 👇 Use "any" so TypeScript stops complaining about the new Responses types
    const body: any = {
      model: "gpt-4.1-mini", // or "gpt-4o-mini" if you prefer
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: {
                url: imageUrl,
              },
              detail: "high",
            },
          ],
        },
      ],
    };

    const response: any = await client.responses.create(body);

    // Try to extract text safely
    let summary = "No analysis returned.";

    try {
      const output = response.output;
      if (Array.isArray(output) && output[0]?.content?.length) {
        const textPieces = output[0].content
          .filter((c: any) => c.type === "output_text")
          .map((c: any) => c.text);
        if (textPieces.length) {
          summary = textPieces.join("\n");
        }
      }
    } catch (err) {
      console.error("Error parsing OpenAI response:", err);
    }

    return Response.json({ summary });
  } catch (err: any) {
    console.error("analyze-job error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to analyze job" }),
      { status: 500 }
    );
  }
}
