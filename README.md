# Voice AI Tutor (STT → LLM → TTS)

This project is a local, end-to-end **voice AI tutor** with:

- **Audio → Text (STT)**: OpenAI **Whisper** (`small`, same as `voice_agent.py`)
- **Text → Response (LLM)**: **Ollama** (`llama3.2` by default)
- **Text → Audio (TTS)**: macOS **`say`** (rate 185) with **pyttsx3** fallback

It provides:

- A **FastAPI backend** (`backend/`) exposing `/api/stt`, `/api/chat`, `/api/tts`, `/api/tutor`.
- A **Next.js frontend** (`frontend/`) to record audio, get a response, and play the spoken reply.

## Prereqs

- Python **3.10+**
- **[Ollama](https://ollama.com/)** running locally, with `llama3.2` pulled: `ollama pull llama3.2`
- (Recommended) macOS with Apple Silicon or a machine with NVIDIA GPU for faster Whisper

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
```

## Run backend (FastAPI)

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run frontend (Next.js)

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the UI at:

- `http://localhost:3000`

## Notes

- **Live STT (WebSocket)** connects from the browser **straight to FastAPI** on port **8000** (`/ws/stt`). HTTP calls like `/api/tutor` go through Next.js and use `API_BASE` on the server. If you see `WebSocket STT failed`, start the backend (`python run.py`) and add `frontend/.env.local` from `frontend/.env.local.example` (then restart `npm run dev`).
- First STT run downloads the Whisper **small** checkpoint (via the `openai-whisper` package).
- Optional Hugging Face adapters (`backend/app/llm.py`, `stt.py`, `tts.py`) remain in the repo if you want to swap providers back in `providers.py`.
- Live transcript uses **WebSocket streaming** to `ws://<your-mac-ip>:8000/ws/stt`. If you open the UI from another device, make sure the backend is started with `--host 0.0.0.0` so it’s reachable on your LAN.
- Tutor/tts calls still go through the frontend’s HTTP proxy routes.

