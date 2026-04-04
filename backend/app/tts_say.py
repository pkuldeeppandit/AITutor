from __future__ import annotations

import io
import re
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass

import numpy as np
import soundfile as sf
from scipy.io import wavfile


@dataclass
class TTSResult:
    wav_bytes: bytes
    sample_rate: int


def _plain_for_tts(text: str) -> str:
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    t = re.sub(r"\*([^*]+)\*", r"\1", t)
    t = t.replace("`", "")
    return t.strip()


def _aiff_to_wav_bytes(path: str) -> TTSResult:
    audio, sr = sf.read(path, dtype="float32", always_2d=False)
    if isinstance(audio, np.ndarray) and audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    audio = np.clip(np.asarray(audio, dtype=np.float32), -1.0, 1.0)
    pcm = (audio * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    wavfile.write(buf, int(sr), pcm)
    return TTSResult(wav_bytes=buf.getvalue(), sample_rate=int(sr))


def _say_to_wav(text: str) -> TTSResult:
    with tempfile.TemporaryDirectory() as tmp:
        aiff_path = os.path.join(tmp, "speech.aiff")
        if sys.platform == "darwin":
            cmd = ["/usr/bin/say", "-r", "185", "-o", aiff_path, "--", text]
        else:
            say_ex = shutil.which("say")
            if not say_ex:
                raise FileNotFoundError("say")
            cmd = [say_ex, "-r", "185", "-o", aiff_path, "--", text]
        subprocess.run(cmd, check=True, timeout=120)
        return _aiff_to_wav_bytes(aiff_path)


def _pyttsx3_to_wav(text: str) -> TTSResult:
    import pyttsx3

    with tempfile.TemporaryDirectory() as tmp:
        wav_path = os.path.join(tmp, "speech.wav")
        engine = pyttsx3.init()
        engine.setProperty("rate", 180)
        engine.save_to_file(text, wav_path)
        engine.runAndWait()
        if not os.path.isfile(wav_path) or os.path.getsize(wav_path) == 0:
            raise RuntimeError("pyttsx3 did not produce a WAV file.")
        return _aiff_to_wav_bytes(wav_path)


class SayPyttsx3TTS:
    """
    macOS `say` first (matches `voice_agent.py`), then optional `say` on PATH, then pyttsx3.
    """

    def synthesize(self, text: str) -> TTSResult:
        plain = _plain_for_tts(text)
        if not plain:
            raise ValueError("empty text after stripping markdown")

        try:
            return _say_to_wav(plain)
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            pass

        return _pyttsx3_to_wav(plain)
