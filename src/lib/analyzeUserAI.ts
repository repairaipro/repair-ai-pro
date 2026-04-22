import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

  const fullPrompt = `${modePrompt}\n\nUser problem:\n${prompt}`;

  const content: any[] = [
    {
      type: "input_text",
      text: fullPrompt,
    },
  ];

  if (imageUrl) {
    content.push({
      type: "input_image",
      image_url: imageUrl,
      detail: "high",
    });
  }

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: content,
  });

  return response.output_text || "No response";
}
