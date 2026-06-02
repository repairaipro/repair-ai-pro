import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";
import type OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { prompt, image } = await req.json();

    if (!prompt?.trim() && !image) {
      return NextResponse.json({ ok: false, error: "No prompt or image provided" }, { status: 400 });
    }

    const userContent: OpenAI.ChatCompletionContentPart[] = [
      {
        type: "text",
        text: `Create a detailed repair plan for: "${prompt?.trim() ?? "See image"}".

Before committing to a plan, verify you understand the full scope:
- What exactly is broken or not working?
- What is the root cause?
- Are there any related issues that should be addressed?
- What is the simplest solution vs. comprehensive fix?

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "summary": "2-3 sentence overview of problem and recommended fix",
  "diagnosis": "What specifically is wrong and why",
  "difficulty": "Easy | Medium | Hard | Call a Pro",
  "time_required": "e.g. 30 minutes | 2-3 hours",
  "steps": ["Step 1: ...", "Step 2: ...", "..."],
  "tools": ["Tool 1", "Tool 2", "..."],
  "parts": ["Part 1 (approx cost)", "Part 2", "..."],
  "warnings": ["Safety warning 1", "..."],
  "cost_estimate": { "diy": "$X - $Y", "pro": "$A - $B" },
  "questions_answered": ["question 1 we answered", "question 2"]
}`,
      },
    ];

    if (image) {
      userContent.push({
        type: "image_url",
        image_url: { url: image, detail: "high" },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a master repair technician with 30 years of experience across all trades. Generate detailed repair plans as pure JSON only — no markdown, no code fences, no commentary outside the JSON object.",
        },
        { role: "user", content: userContent },
      ],
      max_tokens: 1200,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const repair = JSON.parse(raw);

    return NextResponse.json({ ok: true, repair });
  } catch (error: any) {
    const errorMessage = await handleOpenAIError(error);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
