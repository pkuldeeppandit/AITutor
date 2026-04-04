from __future__ import annotations

from dataclasses import dataclass

import anyio

from .chat_types import ChatTurn
from .prompts import TUTOR_SYSTEM_PROMPT
from .providers import get_llm, get_stt, get_tts


@dataclass
class AgentResultFrame:
    transcript: str
    response_text: str
    wav_bytes: bytes | None = None


async def run_voice_agent_from_wav_bytes(
    wav_bytes: bytes,
    *,
    include_tts: bool = True,
    timeout_s: float = 180.0,
) -> AgentResultFrame:
    """
    STT → LLM → (optional) TTS pipeline.

    Runs each blocking call in a thread so the FastAPI event loop stays free.
    Returns an AgentResultFrame with transcript, response_text, and optional wav_bytes.
    """
    with anyio.fail_after(timeout_s):
        # 1. Speech-to-Text
        stt = get_stt()
        stt_result = await anyio.to_thread.run_sync(stt.transcribe_wav_bytes, wav_bytes)
        transcript = stt_result.text

        # 2. LLM
        llm = get_llm()
        messages = [
            ChatTurn(role="system", content=TUTOR_SYSTEM_PROMPT),
            ChatTurn(role="user", content=transcript),
        ]
        response_text = await anyio.to_thread.run_sync(llm.generate, messages)

        # 3. (Optional) Text-to-Speech
        wav_out: bytes | None = None
        if include_tts:
            tts = get_tts()
            tts_result = await anyio.to_thread.run_sync(tts.synthesize, response_text)
            wav_out = tts_result.wav_bytes

    return AgentResultFrame(
        transcript=transcript,
        response_text=response_text,
        wav_bytes=wav_out,
    )
