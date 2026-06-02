import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";
import { getTradeKnowledge } from "@/lib/diagnosticKnowledge";
import type OpenAI from "openai";

type ExplainMode = "beginner" | "homeowner" | "pro";
type HistoryItem = { role: "user" | "assistant"; content: string };

function buildSystemPrompt(mode?: ExplainMode, trade?: string): string {
  const tradeKnowledge = trade ? getTradeKnowledge(trade) : null;
  const tradeContext = tradeKnowledge ? `\nYou are an expert in ${trade}.\n${tradeKnowledge.systemPrompt}` : "";

  const base = `You are RepairGPT — a world-class home repair and maintenance AI.
You analyze images, diagnose problems, and give clear, actionable guidance.
Always include: what the problem is, urgency level, estimated cost range, and whether to DIY or hire a pro.
Use markdown formatting: **bold** for key points, bullet lists for steps.
Be concise but complete. Never leave the user without a clear next step.
CRITICAL: Ask clarifying questions when diagnosis is uncertain. Narrow down the issue before committing to a diagnosis.`;

  if (mode === "beginner") {
    return `${base}${tradeContext}
Audience: Total beginner. No prior knowledge assumed.
Style: Plain English only. No jargon whatsoever. Use numbered steps. Short sentences.
Always reassure and encourage.`;
  }
  if (mode === "pro") {
    return `${base}${tradeContext}
Audience: Licensed professional or experienced tradesperson.
Style: Technical language encouraged. Include part numbers, specs, failure modes, relevant codes (NEC, UPC, etc.).`;
  }
  return `${base}${tradeContext}
Audience: Typical homeowner — capable, smart, but not a specialist.
Style: Clear and practical. Brief technical terms are fine but always define them.`;
}

export async function POST(req: Request) {
  try {
    const { message, imageUrl, history, mode, trade } = await req.json();

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt(mode as ExplainMode, trade) },
    ];

    // Include recent conversation history for context (last 8 turns)
    if (Array.isArray(history)) {
      for (const h of (history as HistoryItem[]).slice(-8)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    // Build current user message
    const userContent: OpenAI.ChatCompletionContentPart[] = [];

    if (message?.trim()) {
      userContent.push({ type: "text", text: message.trim() });
    }

    if (imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl, detail: "high" },
      });
      if (!message?.trim()) {
        userContent.push({
          type: "text",
          text: "Analyze this image. What do you see? What's the problem and how do I fix it?",
        });
      }
    }

    if (userContent.length === 0) {
      return NextResponse.json({ error: "No message or image provided" }, { status: 400 });
    }

    messages.push({ role: "user", content: userContent });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1200,
      temperature: 0.4,
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response. Please try again.";
    return NextResponse.json({ reply });
  } catch (error: any) {
    const errorMessage = await handleOpenAIError(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
