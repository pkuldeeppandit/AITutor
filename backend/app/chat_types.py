from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ChatTurn:
    role: str  # "system" | "user" | "assistant"
    content: str
