import { NextResponse } from "next/server";
import { analyzeAttachment } from "@/lib/analyzeAttachment";

export async function POST(req: Request) {
  // Safety: dev-only test endpoint (burns OpenAI tokens)
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing imageUrl" },
        { status: 400 }
      );
    }

    const result = await analyzeAttachment(imageUrl);

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Vision failed" },
      { status: 500 }
    );
  }
}