import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/voice/tts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language } = body as {
      text?: string;
      language?: string;
    };

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const result = await synthesizeSpeech(
      text.trim(),
      language === "hi" ? "hi" : "en"
    );

    return NextResponse.json({
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: error.message || "Text-to-speech failed" },
      { status: 500 }
    );
  }
}
