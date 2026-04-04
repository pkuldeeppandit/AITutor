from __future__ import annotations

from .llm_ollama import OllamaChat
from .stt_whisper_local import OpenAIWhisperSTT
from .tts_say import SayPyttsx3TTS

_stt: OpenAIWhisperSTT | None = None
_llm: OllamaChat | None = None
_tts: SayPyttsx3TTS | None = None


def get_stt() -> OpenAIWhisperSTT:
    global _stt
    if _stt is None:
        _stt = OpenAIWhisperSTT()
    return _stt


def get_llm() -> OllamaChat:
    global _llm
    if _llm is None:
        _llm = OllamaChat()
    return _llm


def get_tts() -> SayPyttsx3TTS:
    global _tts
    if _tts is None:
        _tts = SayPyttsx3TTS()
    return _tts

