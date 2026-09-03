/**
 * Text-to-Speech via Sarvam (Indian languages + English) or ElevenLabs.
 * Does NOT use browser speechSynthesis.
 */

export async function synthesizeSpeech(
  text: string,
  language: "en" | "hi" = "en"
): Promise<{ audioBase64: string; mimeType: string; provider: string }> {
  const sarvamKey = process.env.SARVAM_API_KEY;
  const elevenKey = process.env.ELEVENLABS_API_KEY;

  if (sarvamKey) {
    try {
      return await ttsWithSarvam(text, language, sarvamKey);
    } catch (e) {
      console.error("Sarvam TTS failed, trying ElevenLabs:", e);
      if (!elevenKey) throw e;
    }
  }

  if (elevenKey) {
    return await ttsWithElevenLabs(text, elevenKey);
  }

  throw new Error(
    "No TTS provider configured. Set SARVAM_API_KEY or ELEVENLABS_API_KEY in .env.local"
  );
}

async function ttsWithSarvam(
  text: string,
  language: "en" | "hi",
  apiKey: string
): Promise<{ audioBase64: string; mimeType: string; provider: string }> {
  // bulbul:v3 speakers (lowercase). shubh = default male; priya = clear female
  const speaker = language === "hi" ? "priya" : "shubh";
  const targetLanguage = language === "hi" ? "hi-IN" : "en-IN";

  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.slice(0, 2400),
      target_language_code: targetLanguage,
      speaker,
      model: "bulbul:v3",
      pace: 1.0,
      speech_sample_rate: 22050,
      output_audio_codec: "wav",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sarvam TTS error: ${res.status} ${err}`);
  }

  const data = await res.json();
  // Response: { audios: ["base64..."] } or { audio: "base64..." }
  const audioBase64 = data?.audios?.[0] || data?.audio;
  if (!audioBase64) {
    throw new Error("Sarvam TTS returned no audio");
  }

  return {
    audioBase64,
    mimeType: "audio/wav",
    provider: "sarvam",
  };
}

async function ttsWithElevenLabs(
  text: string,
  apiKey: string
): Promise<{ audioBase64: string; mimeType: string; provider: string }> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS error: ${res.status} ${err}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    audioBase64,
    mimeType: "audio/mpeg",
    provider: "elevenlabs",
  };
}
