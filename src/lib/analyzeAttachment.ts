import { openai } from "@/lib/openaiClient";
import type OpenAI from "openai";

export async function analyzeAttachment(imageUrl: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `
You are an expert maintenance diagnostic system.

Analyze the image and return ONLY valid JSON.

{
 "trade": "plumber | electrician | hvac | mechanic | appliance | general",
 "severity": "low | medium | high",
 "issue": "short description",
 "suggested_fix": "recommended repair",
 "estimated_cost_low": number,
 "estimated_cost_high": number,
 "estimated_time_minutes": number
}

Rules:
- Use realistic US repair costs
- Be concise
- No explanation outside JSON
`,
          },
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "auto" },
          },
        ],
      },
    ],
    max_tokens: 600,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "";

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {
      trade: "general",
      severity: "unknown",
      issue: text,
      suggested_fix: "",
      estimated_cost_low: null,
      estimated_cost_high: null,
      estimated_time_minutes: null,
    };
  }

  const jobDescription = `
Trade Needed: ${parsed.trade}

Issue:
${parsed.issue}

Suggested Fix:
${parsed.suggested_fix}

Estimated Cost:
$${parsed.estimated_cost_low} - $${parsed.estimated_cost_high}

Estimated Repair Time:
~${parsed.estimated_time_minutes} minutes
`;

  return {
    ...parsed,
    jobDescription,
  };
}