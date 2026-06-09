import { openai } from "@/lib/openaiClient";
import type OpenAI from "openai";

export type ExplainMode = "beginner" | "homeowner" | "pro";

export async function analyzeWithAI(
  prompt: string,
  imageUrl: string | null,
  mode: ExplainMode = "homeowner"
) {
  let modePrompt = "";

  if (mode === "beginner") {
    modePrompt =
      "Explain this like I'm a total beginner DIY homeowner. Avoid jargon, use plain language, and give step-by-step guidance.";
  } else if (mode === "homeowner") {
    modePrompt =
      "Explain this for a typical homeowner with some common-sense understanding. Use simple technical terms but always define them.";
  } else if (mode === "pro") {
    modePrompt =
      "Explain this for a professional technician. You can use technical language, mention likely failure modes, tools, and relevant standards where appropriate.";
  }

  const userContent: OpenAI.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `${modePrompt}\n\nUser problem:\n${prompt}`,
    },
  ];

  if (imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: imageUrl, detail: "high" },
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    max_tokens: 800,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || "No response";
}
