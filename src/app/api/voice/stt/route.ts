import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/voice/stt";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || "en";

    if (!file) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "audio/webm";

    const result = await transcribeAudio(
      buffer,
      mimeType,
      language === "hi" ? "hi" : "en"
    );

    return NextResponse.json({
      text: result.text,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error("STT error:", error);
    return NextResponse.json(
      { error: error.message || "Speech-to-text failed" },
      { status: 500 }
    );
  }
}
