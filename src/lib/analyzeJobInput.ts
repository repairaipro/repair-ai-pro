import { openai } from "@/lib/openaiClient";
import type OpenAI from "openai";

type AnalyzeInput = {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  text?: string;
};

export async function analyzeJobInput(input: AnalyzeInput) {
  const userContent: OpenAI.ChatCompletionContentPart[] = [];

  const systemPrompt = `You are a home repair and maintenance expert AI.
Analyze the provided description and/or image and return a JSON object with these exact fields:
{
  "issue": "brief description of the problem",
  "trade": "one of: Plumbing|Electrical|HVAC|Carpentry|Roofing|Painting|Appliance Repair|Handyman|Landscaping|Locksmith|Auto Mechanic|Auto Body & Paint|Auto Detailing|Towing|Tire & Wheels|Auto Glass|General|Other",
  "severity": "low|moderate|high|emergency",
  "estimatedCostLow": number (USD, no dollar sign),
  "estimatedCostHigh": number (USD, no dollar sign),
  "estimatedTimeMinutes": number,
  "summary": "2-3 sentence plain English explanation of the problem and recommended action"
}
Return only valid JSON. No markdown, no code fences.`;

  // Build user content with text + image
  const textParts: string[] = [];
  if (input.text) textParts.push(`User description: ${input.text}`);
  if (input.videoUrl) textParts.push(`A video was uploaded showing the issue: ${input.videoUrl}`);
  if (input.audioUrl) textParts.push(`Audio note about the issue: ${input.audioUrl}`);

  if (textParts.length > 0) {
    userContent.push({ type: "text", text: textParts.join("\n") });
  }

  if (input.imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: input.imageUrl, detail: "high" },
    });
  }

  if (userContent.length === 0) {
    userContent.push({ type: "text", text: "Analyze this maintenance request." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 600,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw);
  } catch (err: any) {
    console.error("analyzeJobInput error:", err.message);
    return {
      issue: "Analysis failed",
      trade: "General",
      severity: "moderate",
      estimatedCostLow: 0,
      estimatedCostHigh: 0,
      estimatedTimeMinutes: 60,
      summary: "Could not analyze automatically. Please review manually.",
    };
  }
}
