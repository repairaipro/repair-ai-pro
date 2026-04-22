import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type AnalyzeInput = {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  text?: string;
};

export async function analyzeJobInput(input: AnalyzeInput) {
  const content: any[] = [];

  if (input.text) {
    content.push({
      type: "input_text",
      text: `User description: ${input.text}`,
    });
  }

  if (input.imageUrl) {
    content.push({
      type: "input_image",
      image_url: input.imageUrl,
      detail: "auto",
    });
  }

  if (input.videoUrl) {
    content.push({
      type: "input_text",
      text: `A video was uploaded showing the problem: ${input.videoUrl}`,
    });
  }

  if (input.audioUrl) {
    content.push({
      type: "input_text",
      text: `Audio description of the problem: ${input.audioUrl}`,
    });
  }

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `
Analyze the maintenance issue.

Return a JSON response with:

issue
trade
severity
estimatedCostLow
estimatedCostHigh
estimatedTimeMinutes
summary

Only return JSON.
`,
          },
          ...content,
        ],
      },
    ],
  });

  const text = response.output_text ?? "{}";

  try {
    return JSON.parse(text);
  } catch {
    return {
      issue: "Unknown",
      trade: "general",
      severity: "unknown",
      summary: text,
    };
  }
}