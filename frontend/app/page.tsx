"use client";

import { useRef, useState, useCallback } from "react";
import { AnimatedBot } from "./components/AnimatedBot";
import Conversation from "./components/Conversation";
import styles from "./page.module.css";
import "./components/AnimatedBot.css";


type TutorResult = {
  transcript: string;
  response: string;
};

/**
 * STT WebSocket hits the FastAPI backend directly (Next.js API routes cannot proxy WS by default).
 * Set NEXT_PUBLIC_WS_BASE or NEXT_PUBLIC_API_BASE in frontend/.env.local (see .env.local.example).
 */
function getWsSttUrl(): string {
  const wsExplicit = process.env.NEXT_PUBLIC_WS_BASE?.trim();
  if (wsExplicit) {
    return new URL("/ws/stt", wsExplicit).toString();
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (apiBase) {
    try {
      const u = new URL(apiBase);
      const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProto}//${u.host}/ws/stt`;
    } catch {
      /* fall through */
    }
  }

  if (typeof window === "undefined") {
    return "ws://127.0.0.1:8000/ws/stt";
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  return `${proto}//${host}:8000/ws/stt`;
}

function encodeWavFromFloat32Mono(samples: Float32Array, sampleRate: number): Uint8Array {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }

  return new Uint8Array(buffer);
}

function plainTextForSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`/g, "")
    .trim();
}

/** Shown and spoken when the user taps Talk (same idea as `voice_agent.py`). */
const ASSISTANT_GREETING =
  "Hi, I'm Yuri, your English tutor. How can I assist you today? " +
  "You can ask about vocabulary, grammar, or practice a sentence.";

export default function HomePage() {
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmPendingRef = useRef<Float32Array[]>([]);
  const pcmAllRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(48000);
  const lastChunkAtRef = useRef<number>(0);
  const isSendingRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const assistantSpeakingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<TutorResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [assistantIntro, setAssistantIntro] = useState<string | null>(null);

  const handleAudioPlay = useCallback(() => setIsSpeaking(true), []);
  const handleAudioEnded = useCallback(() => {
    setIsSpeaking(false);
    assistantSpeakingRef.current = false;
  }, []);

  const speakWithBrowserTTS = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setStatus("TTS unavailable in this browser.");
      return;
    }
    const plain = plainTextForSpeech(text);
    if (!plain) return;

    const synth = window.speechSynthesis;
    try {
      synth.resume();
    } catch {
      /* no-op */
    }
    synth.cancel();

    const u = new SpeechSynthesisUtterance(plain);
    u.lang = "en-US";
    u.rate = 1;
    u.volume = 1;
    u.pitch = 1;

    assistantSpeakingRef.current = true;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => {
      assistantSpeakingRef.current = false;
      setIsSpeaking(false);
    };
    u.onerror = () => {
      assistantSpeakingRef.current = false;
      setIsSpeaking(false);
    };

    let spoke = false;
    const run = () => {
      if (spoke) return;
      spoke = true;
      try {
        synth.resume();
      } catch {
        /* no-op */
      }
      synth.speak(u);
    };

    void synth.getVoices();
    if (synth.getVoices().length === 0) {
      synth.addEventListener("voiceschanged", run, { once: true });
      window.setTimeout(run, 200);
      window.setTimeout(run, 800);
    } else {
      run();
    }
  }, []);

  async function startRecording() {
    setStatus("");
    setResult(null);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setLiveTranscript("");
    setShowTutor(false);
    setAssistantIntro(null);

    // Must run before any `await` — browsers only allow speechSynthesis in the user-gesture turn.
    speakWithBrowserTTS(ASSISTANT_GREETING);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("Microphone access denied or unavailable.");
      return;
    }
    micStreamRef.current = stream;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextClass({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;
    sampleRateRef.current = audioCtx.sampleRate;
    try {
      await audioCtx.resume();
    } catch {
      /* no-op */
    }

    const wsUrl = getWsSttUrl();
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => setStatus("Streaming STT connected");
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(String(evt.data)) as { type?: string; text?: string; detail?: string };
        if (data.type === "partial" && data.text) {
          const text = data.text.trim();
          if (!text) return;
          // Each WS message is a full decode of that ~1.5s chunk, not a delta — replace, don't append.
          if (assistantSpeakingRef.current) return;
          setLiveTranscript(text);
        } else if (data.type === "error" && data.detail) {
          setStatus(`STT error: ${data.detail}`);
        }
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () =>
      setStatus(
        `WebSocket STT failed — tried ${wsUrl}. Start the FastAPI server on that host/port ` +
        `(e.g. python run.py or uvicorn backend.app.main:app --host 0.0.0.0 --port 8000). ` +
        `If the API is not on port 8000, set NEXT_PUBLIC_API_BASE or NEXT_PUBLIC_WS_BASE in frontend/.env.local and restart next dev.`
      );
    wsRef.current = ws;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    pcmPendingRef.current = [];
    pcmAllRef.current = [];
    lastChunkAtRef.current = performance.now();

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const frame = new Float32Array(input);
      pcmPendingRef.current.push(frame);
      pcmAllRef.current.push(frame);

      const now = performance.now();
      if (now - lastChunkAtRef.current < 1500) return;
      if (isSendingRef.current) return;
      if (assistantSpeakingRef.current) return;

      lastChunkAtRef.current = now;
      void sendLatestChunkForStt();
    };

    // Do not send mic to speakers — otherwise TTS/greeting is picked up and Whisper prints garbage.
    const silent = audioCtx.createGain();
    silent.gain.value = 0;
    source.connect(processor);
    processor.connect(silent);
    silent.connect(audioCtx.destination);
    setAssistantIntro(ASSISTANT_GREETING);
    setIsRecording(true);
  }

  async function sendLatestChunkForStt() {
    const audioCtx = audioCtxRef.current;
    const sampleRate = audioCtx?.sampleRate ?? sampleRateRef.current;
    if (pcmPendingRef.current.length === 0) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const chunks = pcmPendingRef.current;
    pcmPendingRef.current = [];

    const total = chunks.reduce((n, a) => n + a.length, 0);
    const merged = new Float32Array(total);
    let o = 0;
    for (const a of chunks) {
      merged.set(a, o);
      o += a.length;
    }

    const wavBytes = encodeWavFromFloat32Mono(merged, sampleRate);
    isSendingRef.current = true;
    try {
      ws.send(wavBytes);
    } finally {
      isSendingRef.current = false;
    }
  }

  async function stopRecordingAndSend() {
    setIsRecording(false);
    setStatus("Processing… (first run downloads models)");

    try {
      processorRef.current?.disconnect();
      processorRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    } catch {
      /* no-op */
    }

    await sendLatestChunkForStt();
    try {
      wsRef.current?.close();
    } catch {
      /* no-op */
    }
    wsRef.current = null;

    let file: File;
    try {
      const all = pcmAllRef.current;
      pcmAllRef.current = [];
      const total = all.reduce((n, a) => n + a.length, 0);
      const merged = new Float32Array(total);
      let o = 0;
      for (const a of all) {
        merged.set(a, o);
        o += a.length;
      }
      const wavBytes = encodeWavFromFloat32Mono(merged, sampleRateRef.current);
      const wavBlob = new Blob([wavBytes as unknown as BlobPart], { type: "audio/wav" });
      file = new File([wavBlob], "audio.wav", { type: "audio/wav" });
    } catch {
      setStatus("Recording stopped, but no audio was captured.");
      return;
    }

    const form = new FormData();
    form.append("audio", file);

    const tutorRes = await fetch(`/api/tutor`, {
      method: "POST",
      body: form
    });
    if (!tutorRes.ok) {
      const txt = await tutorRes.text();
      setStatus(`Backend error: ${txt}`);
      return;
    }
    const tutorJson = (await tutorRes.json()) as TutorResult;
    setResult(tutorJson);
    setShowTutor(true);
    // Same user activation as the Stop click may still apply here (before the TTS fetch await).
    speakWithBrowserTTS(tutorJson.response);

    const ttsRes = await fetch(`/api/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: tutorJson.response })
    });
    if (!ttsRes.ok) {
      const txt = await ttsRes.text();
      setStatus(`Server TTS failed; browser voice already tried. (${txt})`);
      return;
    }
    const wavBlob = await ttsRes.blob();
    if (wavBlob.size < 64) {
      setStatus("Server TTS empty; browser voice already tried.");
      return;
    }
    const url = URL.createObjectURL(wavBlob);
    setAudioUrl(url);
    setStatus("Done — reply spoken in browser; use ▶ below for server-generated audio");
  }

  return (
    <main className={styles.landingPage}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>
            <span className={styles.neon}>AI</span> - VOICE
            <br />
            AGENTS
          </h1>
        </div>

        <div className={styles.heroCenter}>
          <AnimatedBot
            isSpeaking={isSpeaking}
            isRecording={isRecording}
            onTalkClick={startRecording}
            onStopClick={stopRecordingAndSend}
          />
        </div>

        <div className={styles.heroSub}>
          <p>The All-In-One Platform For Voice AI Agents And Everything Audio</p>
        </div>
      </section>

      {/* Action buttons */}
      <section className={styles.actions}>
        <div className={styles.actionButtons}>
          {!isRecording ? (
            <button
              className={`${styles.btnPrimary} ${styles.btnBracket}`}
              onClick={startRecording}
            >
              TRY IT OUT
            </button>
          ) : (
            <button
              className={`${styles.btnStop} ${styles.btnBracket}`}
              onClick={stopRecordingAndSend}
            >
              STOP & ASK TUTOR
            </button>
          )}
          <button className={`${styles.btnOutline} ${styles.btnBracket}`}>AIRDROP</button>
        </div>
      </section>

      {/* Tutor panel (when result exists) */}
      {showTutor && result && (
        <section className={styles.tutorPanel}>
          <div className={styles.tutorCard}>
            <div className={styles.tutorSection}>
              <label>You said</label>
              <p>{result.transcript}</p>
            </div>
            <div className={styles.tutorSection}>
              <label>Tutor</label>
              <p>{result.response}</p>
              <button
                type="button"
                className={styles.btnPlayAloud}
                onClick={() => speakWithBrowserTTS(result.response)}
              >
                Play aloud (browser voice)
              </button>
            </div>
            {audioUrl && (
              <div className={styles.audioWrapper}>
                <audio
                  ref={audioRef}
                  controls
                  playsInline
                  preload="auto"
                  src={audioUrl}
                  onPlay={handleAudioPlay}
                  onPlaying={() => {
                    assistantSpeakingRef.current = true;
                    setIsSpeaking(true);
                  }}
                  onEnded={handleAudioEnded}
                  onPause={handleAudioEnded}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Live transcript (when recording) */}
      {isRecording && (
        <section className={styles.liveTranscript}>
          {assistantIntro && (
            <div className={styles.assistantIntro} role="status">
              <label>Your tutor says</label>
              <p>{assistantIntro}</p>
              <button
                type="button"
                className={styles.btnPlayAloud}
                onClick={() => speakWithBrowserTTS(ASSISTANT_GREETING)}
              >
                Hear intro again
              </button>
            </div>
          )}
          <div className={styles.transcriptCard}>
            <label>Live preview (latest chunk)</label>
            <p>{liveTranscript || "Listening… speak your question."}</p>
          </div>
        </section>
      )}

      {status && (
        <div className={styles.statusBar}>
          <span>{status}</span>
        </div>
      )}

      {/* ── NEW: Speak-to-Speak Conversation Mode ── */}
      <Conversation />

    </main>
  );
}
