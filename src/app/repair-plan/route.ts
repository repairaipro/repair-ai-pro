import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { prompt, image } = await req.json();

    const input: any[] = [
      {
        type: "input_text",
        text:
          "You are an expert repair technician. Return ONLY a JSON object. " +
          "Analyze the user's issue and return: steps, parts, difficulty, warnings, time_required, " +
          "cost_estimate, when_to_call_pro, and summary."
      },
      {
        type: "input_text",
        text: prompt || "Analyze the attached image."
      }
    ];

    if (image) {
      input.push({
        type: "input_image",
        image_url: image,
        detail: "high"
      });
    }

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input
    });

    const out = resp.output_text;

    let json = {};

    try {
      json = JSON.parse(out);
    } catch {
      json = { summary: out };
    }

    return NextResponse.json({ ok: true, repair: json });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message });
  }
}
