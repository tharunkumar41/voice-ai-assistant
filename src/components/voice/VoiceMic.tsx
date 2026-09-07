"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Voice Activity Detection tuning                                    */
/* ------------------------------------------------------------------ */
const SPEECH_RMS_THRESHOLD = 0.015; // amplitude above which we consider "speaking"
const SILENCE_MS_TO_END_TURN = 1100; // trailing silence after speech -> end of turn
const NO_SPEECH_TIMEOUT_MS = 8000; // give up (and just keep listening) if nothing said
const MAX_TURN_MS = 20000; // hard safety cap per recording
const VAD_POLL_MS = 80;

export type VoiceSessionStatus =
  | "idle" // session not started
  | "listening" // mic open, waiting for / capturing speech
  | "thinking" // STT running / waiting on caller-provided "paused" state
  | "speaking"; // caller-provided "paused" state (assistant is talking)

interface VoiceMicProps {
  language?: "en" | "hi";
  /** Disable the mic entirely (e.g. no workflow selected yet). */
  disabled?: boolean;
  /**
   * True while the assistant is thinking or speaking. While paused the
   * component will not record, but as soon as it flips back to false
   * (and the session is still active) listening resumes automatically —
   * this is what makes the conversation continuous.
   */
  paused?: boolean;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  /** Fired whenever the continuous session starts/stops. */
  onSessionChange?: (active: boolean) => void;
  /** Fired whenever the internal status changes, for UI indicators. */
  onStatusChange?: (status: VoiceSessionStatus) => void;
  className?: string;
}

/**
 * Continuous, hands-free microphone.
 *
 * Click once to start a voice session: the mic stays open and the
 * component automatically detects when the user starts/stops talking
 * (voice activity detection on the raw audio stream), sends each
 * utterance to /api/voice/stt, and — once the caller finishes
 * processing + speaking the reply (signalled via the `paused` prop
 * going back to false) — automatically starts listening again for the
 * next turn. No need to click the mic between turns.
 *
 * Click again (or call the returned stop) to end the session.
 */
export function VoiceMic({
  language = "en",
  disabled,
  paused = false,
  onTranscript,
  onError,
  onSessionChange,
  onStatusChange,
  className,
}: VoiceMicProps) {
  const [sessionActive, setSessionActive] = useState(false);
  const [listening, setListening] = useState(false); // actively recording via VAD
  const [busy, setBusy] = useState(false); // STT round-trip in flight

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSpokenRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const turnStartedAtRef = useRef(0);
  const stoppingRef = useRef(false);
  // Tracks sessionActive without going stale inside the async turn loop.
  const sessionActiveRef = useRef(false);
  useEffect(() => {
    sessionActiveRef.current = sessionActive;
  }, [sessionActive]);

  // Keep latest callbacks in refs so effects/intervals don't need to
  // re-subscribe (and don't go stale) on every parent render.
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reportStatus = useCallback(
    (status: VoiceSessionStatus) => onStatusChange?.(status),
    [onStatusChange]
  );

  const teardownAudioGraph = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopSession = useCallback(() => {
    stoppingRef.current = true;
    setSessionActive(false);
    onSessionChange?.(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // onstop handler checks stoppingRef and will skip sending anything
      mediaRecorderRef.current.stop();
    }
    teardownAudioGraph();
    setListening(false);
    setBusy(false);
    reportStatus("idle");
  }, [onSessionChange, reportStatus, teardownAudioGraph]);

  /** Records one turn: opens the mic, waits for speech + trailing silence, then resolves with the blob. */
  const recordOneTurn = useCallback(async () => {
    stoppingRef.current = false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new AudioCtx();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    analyserRef.current = analyser;

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
    mediaRecorderRef.current = recorder;

    hasSpokenRef.current = false;
    lastSpeechAtRef.current = 0;
    turnStartedAtRef.current = Date.now();

    const dataArray = new Uint8Array(analyser.fftSize);

    return new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        if (vadIntervalRef.current) {
          clearInterval(vadIntervalRef.current);
          vadIntervalRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
        streamRef.current = null;

        if (stoppingRef.current) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType });
        resolve(blob);
      };

      recorder.start();
      setListening(true);
      reportStatus("listening");

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || recorder.state !== "recording") return;

        analyserRef.current.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const now = Date.now();

        if (rms > SPEECH_RMS_THRESHOLD) {
          hasSpokenRef.current = true;
          lastSpeechAtRef.current = now;
        }

        const elapsed = now - turnStartedAtRef.current;
        const silenceFor = hasSpokenRef.current
          ? now - lastSpeechAtRef.current
          : 0;

        const shouldEndOnSilence =
          hasSpokenRef.current && silenceFor > SILENCE_MS_TO_END_TURN;
        const shouldGiveUpNoSpeech =
          !hasSpokenRef.current && elapsed > NO_SPEECH_TIMEOUT_MS;
        const shouldForceStop = elapsed > MAX_TURN_MS;

        if (shouldEndOnSilence || shouldGiveUpNoSpeech || shouldForceStop) {
          // Guard above already confirmed recorder.state === "recording".
          recorder.stop();
        }
      }, VAD_POLL_MS);
    });
  }, [reportStatus]);

  const runTurn = useCallback(async () => {
    try {
      const blob = await recordOneTurn();
      setListening(false);

      if (stoppingRef.current || !sessionActiveRef.current) return;

      if (!blob || blob.size < 800 || !hasSpokenRef.current) {
        // Nothing meaningful captured (timeout / silence) — just keep
        // the session open and listen again without bothering the user.
        return;
      }

      setBusy(true);
      reportStatus("thinking");
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        form.append("language", language);

        const res = await fetch("/api/voice/stt", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "STT failed");

        if (data.text?.trim()) {
          onTranscriptRef.current(data.text.trim());
        }
        // If nothing was transcribed, silently loop back to listening.
      } catch (err: any) {
        onErrorRef.current?.(err.message || "Speech recognition failed");
      } finally {
        setBusy(false);
      }
    } catch (err: any) {
      setListening(false);
      setBusy(false);
      onErrorRef.current?.(
        err?.name === "NotAllowedError"
          ? "Microphone permission denied. Allow mic access and try again."
          : "Could not access microphone."
      );
      stopSession();
    }
  }, [language, recordOneTurn, reportStatus, stopSession]);

  // The heart of "continuous conversation": whenever the session is
  // active and nothing else is happening (not listening, not waiting
  // on STT, and the caller isn't thinking/speaking), kick off the next
  // turn automatically. This effect re-fires every time `paused` flips
  // back to false after the assistant finishes replying, which is what
  // resumes listening without another click.
  useEffect(() => {
    if (sessionActive && !paused && !listening && !busy) {
      runTurn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionActive, paused, listening, busy]);

  useEffect(() => {
    if (paused) reportStatus("speaking");
  }, [paused, reportStatus]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      teardownAudioGraph();
    };
  }, [teardownAudioGraph]);

  const toggleSession = useCallback(() => {
    if (disabled) return;
    if (sessionActive) {
      stopSession();
    } else {
      setSessionActive(true);
      onSessionChange?.(true);
    }
  }, [disabled, sessionActive, stopSession, onSessionChange]);

  let label: React.ReactNode = "🎤 Start conversation";
  if (sessionActive) {
    if (listening) {
      label = (
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          Listening…
        </span>
      );
    } else if (busy) {
      label = "Thinking…";
    } else if (paused) {
      label = "🔊 Speaking…";
    } else {
      label = "Listening…";
    }
  }

  return (
    <Button
      type="button"
      variant={sessionActive ? "destructive" : "outline"}
      disabled={disabled}
      className={className}
      onClick={toggleSession}
      title={sessionActive ? "Click to end voice conversation" : "Click to start a hands-free voice conversation"}
    >
      {label}
      {sessionActive && (
        <span className="ml-2 opacity-70 text-xs hidden sm:inline">
          (click to stop)
        </span>
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
