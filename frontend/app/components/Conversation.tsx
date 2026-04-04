"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import styles from "./Conversation.module.css";

type ChatMessage = {
    role: "user" | "tutor";
    text: string;
};

function getWsTutorUrl(): string {
    const wsExplicit = process.env.NEXT_PUBLIC_WS_BASE?.trim();
    if (wsExplicit) return new URL("/ws/tutor", wsExplicit).toString();

    const apiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
    if (apiBase) {
        try {
            const u = new URL(apiBase);
            const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
            return `${wsProto}//${u.host}/ws/tutor`;
        } catch { /* fall through */ }
    }

    if (typeof window === "undefined") return "ws://127.0.0.1:8000/ws/tutor";
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.hostname}:8000/ws/tutor`;
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

function b64ToWavUrl(b64: string): string {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/wav" });
    return URL.createObjectURL(blob);
}

export default function Conversation() {
    const [isActive, setIsActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
    const [status, setStatus] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const pcmRef = useRef<Float32Array[]>([]);
    const sampleRateRef = useRef<number>(16000);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const currentAudioUrlRef = useRef<string | null>(null);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopEverything(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function stopEverything() {
        try { processorRef.current?.disconnect(); processorRef.current = null; } catch { /* */ }
        try { audioCtxRef.current?.close(); audioCtxRef.current = null; } catch { /* */ }
        try { micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null; } catch { /* */ }
        try { wsRef.current?.send("stop"); wsRef.current?.close(); wsRef.current = null; } catch { /* */ }
        if (currentAudioUrlRef.current) {
            URL.revokeObjectURL(currentAudioUrlRef.current);
            currentAudioUrlRef.current = null;
        }
    }

    const startConversation = useCallback(async () => {
        setMessages([]);
        setStatus("Connecting to tutor…");

        const wsUrl = getWsTutorUrl();
        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
            setIsActive(true);
            setStatus("Connected! Hold 🎤 to speak, release to send.");
        };

        ws.onmessage = async (evt) => {
            try {
                const data = JSON.parse(String(evt.data)) as {
                    type: string; transcript?: string; response?: string; audio_b64?: string; detail?: string;
                };

                if (data.type === "result") {
                    if (data.transcript) {
                        setMessages(prev => [...prev, { role: "user", text: data.transcript! }]);
                    }
                    if (data.response) {
                        setMessages(prev => [...prev, { role: "tutor", text: data.response! }]);
                    }

                    // Play TTS audio
                    if (data.audio_b64) {
                        setIsProcessing(false);
                        setIsTutorSpeaking(true);
                        const url = b64ToWavUrl(data.audio_b64);
                        if (currentAudioUrlRef.current) URL.revokeObjectURL(currentAudioUrlRef.current);
                        currentAudioUrlRef.current = url;

                        const audio = new Audio(url);
                        audio.onended = () => { setIsTutorSpeaking(false); setStatus("Hold 🎤 to speak."); };
                        audio.onerror = () => { setIsTutorSpeaking(false); setStatus("Audio playback error. Hold 🎤 to speak."); };
                        await audio.play().catch(() => {
                            setIsTutorSpeaking(false);
                            setStatus("Click here first to enable audio, then hold 🎤 to speak.");
                        });
                    } else {
                        setIsProcessing(false);
                        setStatus("Hold 🎤 to speak.");
                    }
                } else if (data.type === "error") {
                    setIsProcessing(false);
                    setStatus(`Error: ${data.detail}`);
                } else if (data.type === "stopped") {
                    setIsActive(false);
                    setStatus("Conversation ended.");
                }
            } catch { /* ignore parse errors */ }
        };

        ws.onerror = () => {
            setStatus(`WebSocket failed — is the backend running? (${wsUrl})`);
            setIsActive(false);
        };

        ws.onclose = () => {
            if (isActive) { setStatus("Disconnected."); setIsActive(false); }
        };

        wsRef.current = ws;
    }, [isActive]);

    const endConversation = useCallback(() => {
        stopEverything();
        setIsActive(false);
        setIsRecording(false);
        setIsProcessing(false);
        setIsTutorSpeaking(false);
        setStatus("Conversation ended.");
    }, []);

    // Push-to-talk: START recording on pointerdown
    const startRecording = useCallback(async () => {
        if (!isActive || isProcessing || isTutorSpeaking) return;

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            setStatus("Microphone access denied.");
            return;
        }
        micStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;
        sampleRateRef.current = audioCtx.sampleRate;
        await audioCtx.resume().catch(() => { /* */ });

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        pcmRef.current = [];

        processor.onaudioprocess = (e) => {
            const frame = new Float32Array(e.inputBuffer.getChannelData(0));
            pcmRef.current.push(frame);
        };

        const silent = audioCtx.createGain();
        silent.gain.value = 0;
        source.connect(processor);
        processor.connect(silent);
        silent.connect(audioCtx.destination);

        setIsRecording(true);
        setStatus("🔴 Recording… release to send");
    }, [isActive, isProcessing, isTutorSpeaking]);

    // Push-to-talk: STOP recording on pointerup/leave
    const stopRecordingAndSend = useCallback(async () => {
        if (!isRecording) return;
        setIsRecording(false);
        setIsProcessing(true);
        setStatus("⏳ Tutor is thinking…");

        try { processorRef.current?.disconnect(); processorRef.current = null; } catch { /* */ }
        try { audioCtxRef.current?.close(); audioCtxRef.current = null; } catch { /* */ }
        try { micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null; } catch { /* */ }

        const chunks = pcmRef.current;
        pcmRef.current = [];
        const total = chunks.reduce((n, a) => n + a.length, 0);
        if (total < 1600) { // < 0.1s at 16kHz — too short
            setIsProcessing(false);
            setStatus("Too short, try again. Hold 🎤 to speak.");
            return;
        }

        const merged = new Float32Array(total);
        let o = 0;
        for (const a of chunks) { merged.set(a, o); o += a.length; }

        const wavBytes = encodeWavFromFloat32Mono(merged, sampleRateRef.current);

        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            setIsProcessing(false);
            setStatus("WebSocket not connected. Please start a new conversation.");
            return;
        }
        ws.send(wavBytes);
    }, [isRecording]);

    return (
        <section className={styles.convSection}>
            <div className={styles.convHeader}>
                <h2 className={styles.convTitle}>
                    <span className={styles.neonDot} />
                    Speak to Your Tutor
                </h2>
                <p className={styles.convSubtitle}>
                    Hold the mic button, ask your question, release — the tutor speaks back!
                </p>
            </div>

            {/* Controls */}
            <div className={styles.convControls}>
                {!isActive ? (
                    <button className={styles.btnStart} onClick={startConversation}>
                        🎙️ Start Conversation
                    </button>
                ) : (
                    <button className={styles.btnEnd} onClick={endConversation}>
                        ✕ End Conversation
                    </button>
                )}
            </div>

            {/* Chat history */}
            {messages.length > 0 && (
                <div className={styles.chatHistory}>
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`${styles.bubble} ${msg.role === "user" ? styles.bubbleUser : styles.bubbleTutor}`}
                        >
                            <span className={styles.bubbleLabel}>
                                {msg.role === "user" ? "You" : "🤖 Tutor"}
                            </span>
                            <p className={styles.bubbleText}>{msg.text}</p>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
            )}

            {/* Push-to-talk button */}
            {isActive && (
                <div className={styles.pttArea}>
                    {isTutorSpeaking && (
                        <div className={styles.speakingIndicator}>
                            <span className={styles.speakingDot} />
                            <span className={styles.speakingDot} />
                            <span className={styles.speakingDot} />
                            <span className={styles.speakingLabel}>Tutor is speaking…</span>
                        </div>
                    )}
                    {isProcessing && !isTutorSpeaking && (
                        <div className={styles.thinkingIndicator}>
                            Thinking<span className={styles.dots}>...</span>
                        </div>
                    )}
                    <button
                        className={`${styles.pttButton} ${isRecording ? styles.pttRecording : ""} ${(isProcessing || isTutorSpeaking) ? styles.pttDisabled : ""}`}
                        onPointerDown={startRecording}
                        onPointerUp={stopRecordingAndSend}
                        onPointerLeave={stopRecordingAndSend}
                        disabled={isProcessing || isTutorSpeaking}
                    >
                        🎤
                    </button>
                    <p className={styles.pttHint}>
                        {isRecording ? "Release to send" : "Hold to speak"}
                    </p>
                </div>
            )}

            {/* Status */}
            {status && (
                <div className={styles.statusBar}>
                    <span>{status}</span>
                </div>
            )}
        </section>
    );
}
