from __future__ import annotations

from pydantic import BaseModel


class Settings(BaseModel):
    whisper_model_id: str = "openai/whisper-large-v3"
    # Pick a Gemma 3 checkpoint you have access to. Examples vary by release.
    gemma_model_id: str = "google/gemma-3-1b-it"
    # Kokoro model id may differ depending on the HF repo you use.
    kokoro_model_id: str = "hexgrad/Kokoro-82M"

    device_preference: str = "auto"  # "auto" | "cpu" | "cuda" | "mps"


settings = Settings()

