import { NextResponse } from "next/server";
import { openai, handleOpenAIError } from "@/lib/openaiClient";

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
    const errorMessage = await handleOpenAIError(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
