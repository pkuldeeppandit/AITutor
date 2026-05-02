# AI Tutor — local voice tutor (WebRTC + Pipecat)

The app runs a **real-time voice session** in the browser: your microphone goes to the backend over **WebRTC**, a **Pipecat** pipeline does **VAD → speech-to-text → LLM → TTS**, and audio plays back on the same connection.

Stack in `backend/app/bot.py`:

| Stage | Default |
|--------|---------|
| Transport | Small WebRTC (`POST /offer`) |
| VAD | Silero (via Pipecat) |
| STT | **MLX Whisper** on Apple Silicon if `mlx_whisper` is installed; otherwise **faster-whisper** using `models/faster-whisper-base` if present, or a bundled small model |
| LLM | **Ollama** OpenAI-compatible API (`mistral` by default) |
| TTS | **Piper** (`en_US-amy-medium`), files under `voices/` |

The **Next.js** UI (`frontend/`) connects to the API base from `NEXT_PUBLIC_API_BASE` for signaling.

---

## Prerequisites

- **Python 3.10–3.13** (required today: Pipecat pulls **numba**, which does not support **Python 3.14** yet)
- **Node.js 18+** and npm
- **[Ollama](https://ollama.com/)** installed and running (`ollama serve`), with the chat model pulled (see below)
- **Microphone** and **speakers/headphones**
- **macOS Apple Silicon** is ideal for the optional MLX Whisper path; other platforms still work with faster-whisper

---

## 1. Clone and Python environment

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -U pip
pip install -r requirements.txt
```

**Optional (Apple Silicon, faster / native STT):**

```bash
pip install mlx-whisper
```

Pipecat will prefer MLX Whisper when that import succeeds; otherwise it uses faster-whisper as in `backend/app/bot.py`.

---

## 2. Ollama model

The pipeline expects Ollama at `http://localhost:11434/v1` and uses the **`mistral`** tag by default. Pull it once:

```bash
ollama pull mistral
```

Start Ollama in another terminal (keep this running while the app is running):

```bash
ollama serve
```

If you see `bind: address already in use`, Ollama is already running on `127.0.0.1:11434`, so you can skip `ollama serve`.

Optional quick check that the model runs:

```bash
ollama run mistral
```

To use another model, change `OLLamaLLMService.Settings(model="...")` in `backend/app/bot.py` and pull that tag with Ollama.

---

## 3. Local assets (STT / TTS)

The repo is set up to use:

- **Whisper (fallback):** `models/faster-whisper-base/` — **not committed** (see `.gitignore`); download the CTranslate2 **base** weights from Hugging Face ([Systran/faster-whisper-base](https://huggingface.co/Systran/faster-whisper-base)), which includes `model.bin` and the small config/tokenizer files.

From the **repository root**, with your venv active (after `pip install -r requirements.txt`, which pulls in `huggingface_hub`):

```bash
hf download Systran/faster-whisper-base --local-dir models/faster-whisper-base
```

On older installs you may only have the legacy entry point:

```bash
huggingface-cli download Systran/faster-whisper-base --local-dir models/faster-whisper-base
```

Pure Python (no CLI on `PATH`):

```bash
python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='Systran/faster-whisper-base', local_dir='models/faster-whisper-base')"
```

Optional quick check that the Whisper base model files exist:

```bash
ls models/faster-whisper-base/model.bin
```

Whisper STT is loaded automatically when you run the backend (`python run.py`); there is no separate Whisper server command in this project.

If the folder is missing, `bot.py` still runs: faster-whisper falls back to downloading a small model at runtime. Keeping `models/faster-whisper-base` locally avoids that download and matches the **base** model path in code.

- **Piper voice:** `voices/en_US-amy-medium.onnx` (+ `.json` sidecar if present)

If you add another Piper voice, put it under `voices/` and update `PiperTTSService.Settings(voice="...")` in `backend/app/bot.py`.

---

## 4. Run the backend

From the **repository root** (so paths like `models/` and `voices/` resolve):

```bash
source .venv/bin/activate
python run.py
```

This serves FastAPI on **http://0.0.0.0:8000** with reload. Endpoints used by the app include:

- `POST /offer` — WebRTC signaling
- `DELETE /connection/{pc_id}` — teardown (when the client has a `pc_id`)

You can also run:

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 5. Run the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local # optional; defaults match local backend
npm run dev
```

Open **http://localhost:3000**, click **Start session**, and allow the microphone.

`frontend/.env.local.example` sets:

```bash
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

If the UI and API run on different hosts or ports, set `NEXT_PUBLIC_API_BASE` to the backend origin (no trailing slash) and restart `npm run dev`.

---

## 6. Quick checklist

| Step | Check |
|------|--------|
| Backend | `python run.py` with no import errors |
| Ollama | `ollama list` shows `mistral` (or your chosen model) |
| CORS | Backend allows `http://localhost:3000` (already in `backend/app/main.py`) |
| Browser | HTTPS or `localhost` for `getUserMedia` |
| Paths | Run backend from repo root so `models/` and `voices/` are found |

---

## Troubleshooting

- **`pip install` fails on Python 3.14** — Use **Python 3.13 or older** (see Pipecat / numba constraints), e.g. `brew install python@3.13` and recreate `.venv` with that interpreter.
- **“Could not reach backend”** — Start the API on port 8000 and confirm `NEXT_PUBLIC_API_BASE` matches.
- **Signaling / 500 on `/offer`** — Check the terminal running `run.py` for Pipecat or WebRTC errors; ensure Pipecat extras installed (`pip install -r requirements.txt`).
- **No speech recognition** — Install `mlx-whisper` on Apple Silicon, or ensure `models/faster-whisper-base` exists and `faster-whisper` installed.
- **`AttributeError: torch.utils._pytree.register_pytree_node` or NumPy 2.x STT import errors** — Reinstall pinned deps in your active environment, then restart backend:

```bash
pip install -U "pip<25.1"
pip install -U -r requirements.txt
pip install -U "mlx-whisper"   # recommended on Apple Silicon
python run.py
```

If you previously installed incompatible versions manually, force-reset the key STT stack:

```bash
pip uninstall -y numpy transformers faster-whisper ctranslate2 torch
pip install -U -r requirements.txt
```
- **LLM errors** — Run `ollama serve` and verify `ollama pull` for the model name used in `bot.py`.
- **TTS errors** — Confirm `voices/en_US-amy-medium.onnx` (and Piper dependencies from Pipecat) are present.

---

## Project layout

- `backend/app/main.py` — FastAPI app, CORS, WebRTC offer handler
- `backend/app/bot.py` — Pipecat pipeline (STT / LLM / TTS)
- `frontend/` — Next.js UI (`Conversation.tsx` WebRTC client)
- `run.py` — Convenience entrypoint for uvicorn
