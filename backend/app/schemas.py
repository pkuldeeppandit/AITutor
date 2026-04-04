from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    text: str = Field(min_length=1)


class ChatResponse(BaseModel):
    response: str


class TutorResponse(BaseModel):
    transcript: str
    response: str

