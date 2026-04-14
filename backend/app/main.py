# server.py
import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from backend.app.bot import run_bot

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
pcs: dict[str, SmallWebRTCConnection] = {}


@app.post("/offer")
async def offer(request: Request):
    data = await request.json()
    sdp = data.get("sdp")
    sdp_type = data.get("type")
    if not sdp or not sdp_type:
        raise HTTPException(status_code=400, detail="Missing WebRTC offer 'sdp' or 'type'.")

    conn = SmallWebRTCConnection()
    pcs[conn.pc_id] = conn
    await conn.initialize(sdp=sdp, type=sdp_type)
    answer = conn.get_answer()
    if not answer:
        raise HTTPException(status_code=500, detail="Failed to generate WebRTC answer.")
    asyncio.create_task(run_bot(conn))
    return answer


@app.delete("/connection/{pc_id}")
async def close(pc_id: str):
    if pc_id in pcs:
        await pcs[pc_id].close()
        del pcs[pc_id]


@app.get("/", response_class=HTMLResponse)
async def index():
    return """
    <html>
    <head><title>Voice Agent</title></head>
    <body style="font-family:sans-serif;max-width:400px;margin:80px auto;text-align:center">
      <h2>🎙️ Local Voice Agent</h2>
      <button id="btn" onclick="start()"
        style="padding:16px 32px;font-size:18px;border-radius:8px;cursor:pointer">
        Start Talking
      </button>
      <p id="status" style="color:#666">Idle</p>
      <script>
        let pc;
        async function start() {
          document.getElementById('status').innerText = 'Connecting...';
          pc = new RTCPeerConnection();
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => pc.addTrack(t, stream));
          const audio = document.createElement('audio');
          audio.autoplay = true;
          pc.ontrack = e => { audio.srcObject = e.streams[0]; };
          document.body.appendChild(audio);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const res = await fetch('/offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sdp: offer.sdp, type: offer.type })
          });
          const answer = await res.json();
          await pc.setRemoteDescription(answer);
          document.getElementById('status').innerText = '🟢 Connected — speak now!';
        }
      </script>
    </body>
    </html>
    """