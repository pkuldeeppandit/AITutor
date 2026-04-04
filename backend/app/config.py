from __future__ import annotations

from pydantic import BaseModel


class Settings(BaseModel):
    # Hugging Face paths (optional; used only if you swap providers back to Gemma/Kokoro/HF Whisper).
    whisper_model_id: str = "openai/whisper-large-v3"
    gemma_model_id: str = "google/gemma-3-1b-it"
    kokoro_model_id: str = "hexgrad/Kokoro-82M"

    # Active Pipecat / API stack — matches `voice_agent.py`.
    openai_whisper_model: str = "small"
    ollama_model: str = "llama3.2"

    device_preference: str = "auto"  # auto | cpu | cuda | mps

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()

