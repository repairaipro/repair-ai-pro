import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";

export interface Part {
  name: string;
  estimatedPrice: string;
  why: string;
  /** Retailer-optimized search string: brand/model/OEM number/size when identifiable */
  searchQuery?: string;
  /** OEM or standard part number when one exists, e.g. "Fluidmaster 400A" */
  partNumber?: string;
}

export async function POST(req: Request) {
  const rl = rateLimit(req, "parts-finder", 20);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const { trade, description } = body as { trade?: string; description?: string };

    if (!trade || !description) {
      return NextResponse.json({ error: "Missing trade or description" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a repair parts expert. Given a trade and repair description, list the most likely parts needed. " +
            "Be SPECIFIC: name the common brand and model when one dominates the category (e.g. 'Fluidmaster 400A fill valve', not 'fill valve'), " +
            "include sizes/specs when inferable ('3/8-in compression x 1/2-in FIP'), and give an OEM or standard part number when one exists. " +
            "The searchQuery field is what gets typed into Home Depot/Lowe's/Amazon search — make it land on the right product, not a generic category page. " +
            "Return ONLY a valid JSON array with no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Trade: ${trade}\nDescription: ${description}\n\nReturn a JSON array of 4-6 parts in this exact shape:\n[{ "name": "string (specific, brand+model when known)", "estimatedPrice": "string like $12–$25", "why": "one sentence reason", "searchQuery": "string optimized for retailer search", "partNumber": "string OEM/standard part number, or empty string if none" }]`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";

    let parts: Part[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) parts = JSON.parse(match[0]);
    } catch {
      parts = [];
    }

    // Validate shape (searchQuery/partNumber are optional enrichments)
    const validated: Part[] = parts
      .filter(
        (p): p is Part =>
          typeof p === "object" &&
          p !== null &&
          typeof p.name === "string" &&
          typeof p.estimatedPrice === "string" &&
          typeof p.why === "string"
      )
      .map((p) => ({
        name: p.name,
        estimatedPrice: p.estimatedPrice,
        why: p.why,
        searchQuery: typeof p.searchQuery === "string" && p.searchQuery.trim() ? p.searchQuery : undefined,
        partNumber: typeof p.partNumber === "string" && p.partNumber.trim() ? p.partNumber : undefined,
      }))
      .slice(0, 6);

    return NextResponse.json({ parts: validated });
  } catch (e: any) {
    const errorMessage = await handleOpenAIError(e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
