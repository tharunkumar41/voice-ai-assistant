"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface VoiceMicProps {
  language?: "en" | "hi";
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

/**
 * Hold-to-talk microphone.
 * Uses MediaRecorder (not browser SpeechRecognition).
 * Audio is sent to /api/voice/stt (Deepgram / Sarvam).
 */
export function VoiceMic({
  language = "en",
  disabled,
  onTranscript,
  onError,
  className,
}: VoiceMicProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (disabled || recording || processing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 500) {
          onError?.("Recording too short. Hold the mic and speak.");
          setProcessing(false);
          return;
        }

        setProcessing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          form.append("language", language);

          const res = await fetch("/api/voice/stt", {
            method: "POST",
            body: form,
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "STT failed");
          }

          if (data.text?.trim()) {
            onTranscript(data.text.trim());
          } else {
            onError?.("Could not understand audio. Please try again.");
          }
        } catch (err: any) {
          onError?.(err.message || "Speech recognition failed");
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err: any) {
      onError?.(
        err?.name === "NotAllowedError"
          ? "Microphone permission denied. Allow mic access and try again."
          : "Could not access microphone."
      );
    }
  }, [disabled, recording, processing, language, onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "outline"}
      disabled={disabled || processing}
      className={className}
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onMouseLeave={recording ? stopRecording : undefined}
      onTouchStart={(e) => {
        e.preventDefault();
        startRecording();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopRecording();
      }}
      title="Hold to talk"
    >
      {processing ? (
        "Listening…"
      ) : recording ? (
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          Release to send
        </span>
      ) : (
        "🎤 Hold to talk"
      )}
    </Button>
  );
}

/** Play base64 audio returned from /api/voice/tts */
export async function playBase64Audio(
  audioBase64: string,
  mimeType: string
): Promise<void> {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Audio playback failed"));
    };
    audio.play().catch(reject);
  });
}

export async function speakText(
  text: string,
  language: "en" | "hi" = "en"
): Promise<void> {
  const res = await fetch("/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "TTS failed");
  }

  await playBase64Audio(data.audioBase64, data.mimeType);
}
