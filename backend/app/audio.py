from __future__ import annotations

import io
import subprocess

import numpy as np
import soundfile as sf


def _soundfile_decode(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    audio, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
    if isinstance(audio, np.ndarray) and audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    audio = np.asarray(audio, dtype=np.float32)
    return audio, int(sr)


def _ffmpeg_decode_to_wav(audio_bytes: bytes) -> bytes:
    """
    Uses ffmpeg (if installed) to convert arbitrary audio to WAV (PCM16).
    """
    proc = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            "pipe:0",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-f",
            "wav",
            "pipe:1",
        ],
        input=audio_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", errors="ignore").strip() or "ffmpeg decode failed")
    return proc.stdout


def decode_audio_bytes(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    """
    Decode audio bytes into mono float32 samples + sample rate.

    - Tries libsndfile (soundfile) first.
    - If that fails, tries ffmpeg (supports browser-recorded webm/ogg in many setups).
    """
    try:
        return _soundfile_decode(audio_bytes)
    except Exception:
        wav_bytes = _ffmpeg_decode_to_wav(audio_bytes)
        return _soundfile_decode(wav_bytes)

