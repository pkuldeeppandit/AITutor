"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import styles from "./Conversation.module.css";

function getApiBase(): string {
    const raw = process.env.NEXT_PUBLIC_API_BASE?.trim();
    if (raw) return raw.replace(/\/$/, "");
    if (typeof window === "undefined") return "http://127.0.0.1:8000";
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
}

export default function Conversation() {
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState("");

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const pcIdRef = useRef<string | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const sessionActiveRef = useRef(false);

    const isConnecting = status.startsWith("Connecting");
    const isError =
        status.includes("denied") ||
        status.includes("failed") ||
        status.includes("Could not") ||
        status.includes("lost") ||
        status.includes("Invalid") ||
        status.includes("reach backend");

    const teardownLocal = useCallback(() => {
        sessionActiveRef.current = false;
        try {
            pcRef.current?.close();
        } catch { /* */ }
        pcRef.current = null;
        pcIdRef.current = null;
        try {
            micStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch { /* */ }
        micStreamRef.current = null;
        const el = remoteAudioRef.current;
        if (el) {
            el.srcObject = null;
            el.remove();
            remoteAudioRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            void (async () => {
                const id = pcIdRef.current;
                const api = getApiBase();
                if (id) {
                    try {
                        await fetch(`${api}/connection/${id}`, { method: "DELETE" });
                    } catch { /* */ }
                }
                teardownLocal();
            })();
        };
    }, [teardownLocal]);

    const endConversation = useCallback(async () => {
        const id = pcIdRef.current;
        const api = getApiBase();
        if (id) {
            try {
                await fetch(`${api}/connection/${id}`, { method: "DELETE" });
            } catch { /* */ }
        }
        teardownLocal();
        setIsActive(false);
        setStatus("Session ended.");
    }, [teardownLocal]);

    const startConversation = useCallback(async () => {
        setStatus("Connecting…");

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            setStatus("Microphone access denied.");
            return;
        }
        micStreamRef.current = stream;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const remoteAudio = document.createElement("audio");
        remoteAudio.autoplay = true;
        remoteAudio.setAttribute("playsinline", "true");
        remoteAudio.style.display = "none";
        document.body.appendChild(remoteAudio);
        remoteAudioRef.current = remoteAudio;

        pc.ontrack = (e) => {
            remoteAudio.srcObject = e.streams[0];
            void remoteAudio.play().catch(() => { /* */ });
        };

        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            if (s === "failed" || s === "disconnected" || s === "closed") {
                if (sessionActiveRef.current) {
                    setStatus("Connection lost.");
                    setIsActive(false);
                    teardownLocal();
                }
            }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const api = getApiBase();
        let res: Response;
        try {
            res = await fetch(`${api}/offer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
            });
        } catch {
            teardownLocal();
            setStatus(`Could not reach backend — is it running? (${api})`);
            return;
        }

        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            teardownLocal();
            setStatus(`Signaling failed (${res.status})${detail ? `: ${detail}` : ""}`);
            return;
        }

        const data = (await res.json()) as { sdp?: string; type?: RTCSdpType; pc_id?: string };
        const { pc_id, sdp, type } = data;
        if (!sdp || !type) {
            teardownLocal();
            setStatus("Invalid answer from server.");
            return;
        }

        pcIdRef.current = pc_id ?? null;
        try {
            await pc.setRemoteDescription({ sdp, type });
        } catch {
            teardownLocal();
            setStatus("Could not apply remote WebRTC answer.");
            return;
        }

        sessionActiveRef.current = true;
        setIsActive(true);
        setStatus("Live — speak naturally. Audio plays through your speakers.");
    }, [teardownLocal]);

    return (
        <section className={styles.shell} aria-label="Voice tutor session">
            <article className={styles.card}>
                <header className={styles.cardHeader}>
                    <div className={styles.badgeRow}>
                        <span className={styles.badge}>WebRTC</span>
                        <span className={styles.badge}>Voice</span>
                    </div>
                    <h1 className={styles.title}>Voice tutor</h1>
                    <p className={styles.lead}>
                        Your microphone streams to the Pipecat pipeline; the tutor replies in real time over the same connection.
                    </p>
                </header>

                <div
                    className={`${styles.orbStage} ${isActive ? styles.orbStageLive : ""} ${isConnecting ? styles.orbStageConnecting : ""}`}
                    aria-hidden
                >
                    <div className={styles.orbRing} />
                    <div className={styles.orbRing2} />
                    <div className={styles.orbCore}>
                        {isActive ? (
                            <span className={styles.waveBars} aria-label="Session active">
                                <span className={styles.waveBar} />
                                <span className={styles.waveBar} />
                                <span className={styles.waveBar} />
                                <span className={styles.waveBar} />
                                <span className={styles.waveBar} />
                            </span>
                        ) : (
                            <svg className={styles.micIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path
                                    d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm6-3a6 6 0 01-12 0"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                />
                                <path d="M12 19v3M8 22h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                            </svg>
                        )}
                    </div>
                </div>

                <p className={styles.stateLine}>
                    {isActive ? (
                        <span className={styles.stateLive}>
                            <span className={styles.pulseDot} />
                            Session active
                        </span>
                    ) : isConnecting ? (
                        <span className={styles.stateConnecting}>Connecting…</span>
                    ) : (
                        <span className={styles.stateIdle}>Ready when you are</span>
                    )}
                </p>

                <div className={styles.actions}>
                    {!isActive ? (
                        <button type="button" className={styles.btnStart} onClick={startConversation}>
                            <span className={styles.btnGlow} aria-hidden />
                            Start session
                        </button>
                    ) : (
                        <button type="button" className={styles.btnEnd} onClick={endConversation}>
                            End session
                        </button>
                    )}
                </div>

                {status && (
                    <div
                        className={`${styles.statusBar} ${isError ? styles.statusError : ""} ${isActive && !isError ? styles.statusOk : ""}`}
                        role="status"
                    >
                        {status}
                    </div>
                )}

                <ul className={styles.hints}>
                    <li>Allow microphone when prompted</li>
                    <li>Server handles VAD and speech-to-text</li>
                </ul>
            </article>
        </section>
    );
}
