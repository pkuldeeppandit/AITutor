from __future__ import annotations

import torch

from .config import settings


def pick_device() -> str:
    pref = settings.device_preference.lower().strip()
    if pref in {"cpu", "cuda", "mps"}:
        return pref
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def pick_dtype(device: str):
    # float16 helps on CUDA/MPS; CPU is safer with float32
    if device in {"cuda", "mps"}:
        return torch.float16
    return torch.float32

