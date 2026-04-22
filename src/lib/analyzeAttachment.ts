import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function analyzeAttachment(imageUrl: string) {
  const response = await openai.responses.create(
    {
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
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
              type: "input_image",
              image_url: imageUrl,
              detail: "auto",
            },
          ],
        },
      ],
    } as any
  );

  const text = response.output_text ?? "";

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