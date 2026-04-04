from __future__ import annotations

import ollama

from .chat_types import ChatTurn
from .config import settings


class OllamaChat:
    """Local Ollama chat (same as `voice_agent.py`: ollama.chat + llama3.2)."""

    def generate(self, messages: list[ChatTurn], max_new_tokens: int = 256) -> str:
        del max_new_tokens  # Ollama uses server-side defaults; kept for API parity with GemmaChat.
        payload = [{"role": m.role, "content": m.content} for m in messages]
        response = ollama.chat(model=settings.ollama_model, messages=payload)
        return (response.get("message") or {}).get("content", "").strip()
