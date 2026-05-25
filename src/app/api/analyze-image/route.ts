import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const result = await client.chat.completions.create({
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
    console.error("Vision error:", err);
    return NextResponse.json(
      { error: "Vision error", detail: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
