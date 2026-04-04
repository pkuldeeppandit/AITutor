from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
import torch
from scipy.io import wavfile
from transformers import pipeline

from .config import settings
from .device import pick_device


@dataclass
class TTSResult:
    wav_bytes: bytes
    sample_rate: int


class KokoroTTS:
    """
    Uses Transformers' text-to-speech pipeline when supported by the model.
    Kokoro repos sometimes expose different configs; this wrapper is defensive.
    """

    def __init__(self) -> None:
        self.device = pick_device()
        device_arg = 0 if self.device == "cuda" else -1
        self.pipe = pipeline(
            task="text-to-speech",
            model=settings.kokoro_model_id,
            device=device_arg,
        )

    def synthesize(self, text: str) -> TTSResult:
        out = self.pipe(text)

        # Expected variants:
        # - {"audio": np.ndarray, "sampling_rate": int}
        # - {"audio": {"array": np.ndarray, "sampling_rate": int}}
        audio = None
        sr = None
        if isinstance(out, dict) and "audio" in out and "sampling_rate" in out:
            audio = out["audio"]
            sr = int(out["sampling_rate"])
        elif isinstance(out, dict) and isinstance(out.get("audio"), dict):
            audio = out["audio"].get("array")
            sr = int(out["audio"].get("sampling_rate"))

        if audio is None or sr is None:
            raise RuntimeError(f"Unexpected TTS pipeline output keys: {list(out.keys()) if isinstance(out, dict) else type(out)}")

        if isinstance(audio, torch.Tensor):
            audio = audio.detach().cpu().numpy()
        audio = np.asarray(audio, dtype=np.float32)

        # Convert float32 [-1,1] to int16 for WAV.
        audio_i16 = np.clip(audio, -1.0, 1.0)
        audio_i16 = (audio_i16 * 32767.0).astype(np.int16)

        buf = io.BytesIO()
        wavfile.write(buf, sr, audio_i16)
        return TTSResult(wav_bytes=buf.getvalue(), sample_rate=sr)

