import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { prompt, image } = await req.json();

  const content: any[] = [
    { type: "input_text", text: prompt },
  ];

  if (image) {
    content.push({
      type: "input_image",
      image_url: image,
      detail: "high",
    });
  }

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: content,
  });

  return NextResponse.json({
    output: response.output_text || "No response",
  });
}
