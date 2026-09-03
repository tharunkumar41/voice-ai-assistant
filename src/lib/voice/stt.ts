/**
 * Speech-to-Text via Deepgram (primary) or Sarvam (good for Hindi / Indian languages).
 * Does NOT use browser SpeechRecognition APIs.
 */

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  language: "en" | "hi" = "en"
): Promise<{ text: string; provider: string }> {
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  const sarvamKey = process.env.SARVAM_API_KEY;

  // Prefer Sarvam for Hindi; Deepgram otherwise (or as fallback)
  if (language === "hi" && sarvamKey) {
    try {
      return await transcribeWithSarvam(audioBuffer, mimeType, sarvamKey, "hi-IN");
    } catch (e) {
      console.error("Sarvam STT failed, falling back:", e);
    }
  }

  if (deepgramKey) {
    return await transcribeWithDeepgram(audioBuffer, mimeType, deepgramKey, language);
  }

  if (sarvamKey) {
    return await transcribeWithSarvam(
      audioBuffer,
      mimeType,
      sarvamKey,
      language === "hi" ? "hi-IN" : "en-IN"
    );
  }

  throw new Error(
    "No STT provider configured. Set DEEPGRAM_API_KEY or SARVAM_API_KEY in .env.local"
  );
}

async function transcribeWithDeepgram(
  audioBuffer: Buffer,
  mimeType: string,
  apiKey: string,
  language: "en" | "hi"
): Promise<{ text: string; provider: string }> {
  const langParam = language === "hi" ? "hi" : "en";
  const url = `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=${langParam}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeType || "audio/webm",
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram STT error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text =
    data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";

  return { text, provider: "deepgram" };
}

async function transcribeWithSarvam(
  audioBuffer: Buffer,
  mimeType: string,
  apiKey: string,
  languageCode: string
): Promise<{ text: string; provider: string }> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], {
    type: mimeType || "audio/wav",
  });
  form.append("file", blob, "audio.webm");
  form.append("model", "saaras:v3");
  form.append("language_code", languageCode);
  form.append("mode", "transcribe");

  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sarvam STT error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = (data?.transcript || data?.text || "").trim();

  return { text, provider: "sarvam" };
}
