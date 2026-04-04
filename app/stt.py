from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
import soundfile as sf
import torch
from transformers import AutoProcessor, WhisperForConditionalGeneration

from .config import settings
from .device import pick_device, pick_dtype


@dataclass
class STTResult:
    text: str
    language: str | None = None


class WhisperSTT:
    def __init__(self) -> None:
        self.device = pick_device()
        self.dtype = pick_dtype(self.device)

        self.processor = AutoProcessor.from_pretrained(settings.whisper_model_id)
        self.model = WhisperForConditionalGeneration.from_pretrained(
            settings.whisper_model_id,
            torch_dtype=self.dtype,
            low_cpu_mem_usage=True,
        ).to(self.device)

    def transcribe_wav_bytes(self, wav_bytes: bytes) -> STTResult:
        audio, sr = sf.read(io.BytesIO(wav_bytes), dtype="float32", always_2d=False)
        if isinstance(audio, np.ndarray) and audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        inputs = self.processor(
            audio,
            sampling_rate=sr,
            return_tensors="pt",
        )
        input_features = inputs["input_features"].to(self.device, dtype=self.dtype)

        with torch.no_grad():
            predicted_ids = self.model.generate(input_features)
        text = self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
        return STTResult(text=text, language=None)

