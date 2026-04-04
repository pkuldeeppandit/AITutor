from __future__ import annotations

import anyio
import base64
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response

from .config import settings
from .chat_types import ChatTurn
from .pipecat_voice_agent import run_voice_agent_from_wav_bytes
from .prompts import TUTOR_SYSTEM_PROMPT
from .schemas import ChatRequest, ChatResponse, TutorResponse
from .providers import get_llm, get_stt, get_tts


async def _ws_send_json_safe(ws: WebSocket, payload: dict) -> bool:
    """Send JSON if the client is still connected; return False if they dropped."""
    try:
        await ws.send_json(payload)
        return True
    except WebSocketDisconnect:
        return False
    except RuntimeError as e:
        # Starlette: "Cannot call \"send\" once a close message has been sent."
        if "close message" in str(e).lower() or "disconnect" in str(e).lower():
            return False
        raise


app = FastAPI(title="Voice AI Tutor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
def root() -> str:
    return """
    <html>
      <head><title>Voice AI Tutor API</title></head>
      <body style="font-family: ui-sans-serif, system-ui; padding: 24px;">
        <h2>Voice AI Tutor backend is running</h2>
        <p>Run the Next.js frontend in <code>frontend/</code> and open <code>http://localhost:3000</code>.</p>
      </body>
    </html>
    """


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    llm = get_llm()
    messages = [
        ChatTurn(role="system", content=TUTOR_SYSTEM_PROMPT),
        ChatTurn(role="user", content=req.text),
    ]
    response = llm.generate(messages)
    return ChatResponse(response=response)


@app.post("/api/stt")
async def stt(audio: UploadFile = File(...)):
    try:
        wav_bytes = await audio.read()
        result = await anyio.to_thread.run_sync(get_stt().transcribe_wav_bytes, wav_bytes)
        return {"text": result.text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.websocket("/ws/stt")
async def ws_stt(ws: WebSocket):
    """
    Streaming STT over WebSocket.
    Client sends binary messages containing WAV bytes (small chunks).
    Server responds with JSON messages: {"type":"partial","text":"..."} or {"type":"error","detail":"..."}.
    """
    await ws.accept()
    try:
        while True:
            wav_bytes = await ws.receive_bytes()
            try:
                result = await anyio.to_thread.run_sync(get_stt().transcribe_wav_bytes, wav_bytes)
                if not await _ws_send_json_safe(ws, {"type": "partial", "text": result.text}):
                    return
            except WebSocketDisconnect:
                return
            except Exception as e:
                if not await _ws_send_json_safe(ws, {"type": "error", "detail": str(e)}):
                    return
    except WebSocketDisconnect:
        return


@app.post("/api/tts")
async def tts(req: ChatRequest):
    try:
        out = get_tts().synthesize(req.text)
        return Response(content=out.wav_bytes, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/tutor", response_model=TutorResponse)
async def tutor(audio: UploadFile = File(...)) -> TutorResponse:
    try:
        wav_bytes = await audio.read()
        result = await run_voice_agent_from_wav_bytes(wav_bytes, include_tts=False)
        return TutorResponse(transcript=result.transcript, response=result.response_text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/tutor_audio")
async def tutor_audio(audio: UploadFile = File(...)):
    """
    Convenience endpoint: audio in → WAV out.
    The text transcript/response are returned in headers for quick prototyping.
    """
    try:
        wav_bytes = await audio.read()
        result = await run_voice_agent_from_wav_bytes(wav_bytes, include_tts=True)
        if result.wav_bytes is None:
            raise RuntimeError("Pipecat voice agent returned no wav_bytes.")

        res = Response(content=result.wav_bytes, media_type="audio/wav")
        res.headers["x-transcript"] = result.transcript[:2000]
        res.headers["x-response-text"] = result.response_text[:2000]
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.websocket("/ws/tutor")
async def ws_tutor(ws: WebSocket):
    """
    Continuous speak-to-speak conversation over WebSocket.

    Protocol:
    - Client connects.
    - Client sends BINARY frames: each is a complete WAV recording of one user turn.
    - Client may send TEXT frame "stop" to end the session gracefully.
    - Server replies with JSON after processing each turn:
        {
          "type": "result",
          "transcript": "<what user said>",
          "response": "<tutor reply text>",
          "audio_b64": "<base64 WAV of TTS audio>"
        }
    - On error: {"type": "error", "detail": "<msg>"}
    """
    await ws.accept()
    try:
        while True:
            msg = await ws.receive()

            # Text frame — check for stop command
            if "text" in msg and msg["text"]:
                if msg["text"].strip().lower() == "stop":
                    await _ws_send_json_safe(ws, {"type": "stopped"})
                    break
                continue

            # Binary frame — one user turn (WAV audio)
            wav_bytes: bytes = msg.get("bytes") or b""
            if not wav_bytes:
                continue

            try:
                result = await run_voice_agent_from_wav_bytes(wav_bytes, include_tts=True)
                audio_b64 = (
                    base64.b64encode(result.wav_bytes).decode()
                    if result.wav_bytes
                    else ""
                )
                payload = {
                    "type": "result",
                    "transcript": result.transcript,
                    "response": result.response_text,
                    "audio_b64": audio_b64,
                }
                if not await _ws_send_json_safe(ws, payload):
                    return
            except WebSocketDisconnect:
                return
            except Exception as e:
                if not await _ws_send_json_safe(ws, {"type": "error", "detail": str(e)}):
                    return

    except WebSocketDisconnect:
        return
