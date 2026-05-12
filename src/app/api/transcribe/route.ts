import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob | null;

    if (!audioBlob || audioBlob.size < 500) {
      return NextResponse.json({ error: "Audio too short or missing" }, { status: 400 });
    }

    // Whisper requires an actual File object with a filename
    const ext = audioBlob.type.includes("mp4") ? "mp4"
              : audioBlob.type.includes("ogg")  ? "ogg"
              : "webm";
    const file = new File([audioBlob], `recording.${ext}`, { type: audioBlob.type || "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err: any) {
    console.error("Whisper transcription error:", err.message);
    return NextResponse.json({ error: err.message || "Transcription failed" }, { status: 500 });
  }
}
