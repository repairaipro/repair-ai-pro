import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";
import type OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { prompt, image } = await req.json();

    const content: OpenAI.ChatCompletionContentPart[] = [
      {
        type: "text",
        text:
          "You are an expert repair technician. Return ONLY a JSON object. " +
          "Analyze the user's issue and return: steps, parts, difficulty, warnings, time_required, " +
          "cost_estimate, when_to_call_pro, and summary." +
          "\n\n" +
          (prompt || "Analyze the attached image.")
      }
    ];

    if (image) {
      content.push({
        type: "image_url",
        image_url: { url: image, detail: "high" }
      });
    }

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content }],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const out = resp.choices[0]?.message?.content || "";

    let json = {};

    try {
      json = JSON.parse(out);
    } catch {
      json = { summary: out };
    }

    return NextResponse.json({ ok: true, repair: json });
  } catch (e: any) {
    const errorMessage = await handleOpenAIError(e);
    return NextResponse.json({ ok: false, error: errorMessage });
  }
}
