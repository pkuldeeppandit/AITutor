from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import whisper
from scipy import signal

from .audio import decode_audio_bytes
from .config import settings


@dataclass
class STTResult:
    text: str
    language: str | None = None


def _to_16k_mono_float32(audio: np.ndarray, sr: int) -> np.ndarray:
    audio = np.asarray(audio, dtype=np.float32)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    if sr != 16000:
        n = int(round(len(audio) * 16000 / sr))
        audio = signal.resample(audio, n).astype(np.float32)
    return np.clip(audio, -1.0, 1.0)


class OpenAIWhisperSTT:
    """`openai-whisper` (same stack as `voice_agent.py`), not Hugging Face Transformers."""

    def __init__(self) -> None:
        self._model = whisper.load_model(settings.openai_whisper_model)

    def transcribe_wav_bytes(self, wav_bytes: bytes) -> STTResult:
        audio, sr = decode_audio_bytes(wav_bytes)
        audio = _to_16k_mono_float32(audio, sr)
        out = self._model.transcribe(audio, language="en")
        text = (out.get("text") or "").strip()
        return STTResult(text=text, language=out.get("language"))
