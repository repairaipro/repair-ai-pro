import { NextResponse } from "next/server";
import { analyzeAttachment } from "@/lib/analyzeAttachment";

export async function POST(req: Request) {
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