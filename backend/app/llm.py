from __future__ import annotations

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from .chat_types import ChatTurn
from .config import settings
from .device import pick_device, pick_dtype


class GemmaChat:
    def __init__(self) -> None:
        self.device = pick_device()
        self.dtype = pick_dtype(self.device)

        self.tokenizer = AutoTokenizer.from_pretrained(settings.gemma_model_id, use_fast=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            settings.gemma_model_id,
            torch_dtype=self.dtype,
            low_cpu_mem_usage=True,
        ).to(self.device)

    def generate(self, messages: list[ChatTurn], max_new_tokens: int = 256) -> str:
        # Try chat template when available (preferred).
        if hasattr(self.tokenizer, "apply_chat_template"):
            prompt = self.tokenizer.apply_chat_template(
                [{"role": m.role, "content": m.content} for m in messages],
                tokenize=False,
                add_generation_prompt=True,
            )
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        else:
            # Fallback for plain causal LMs.
            prompt = "\n".join([f"{m.role.upper()}: {m.content}" for m in messages]) + "\nASSISTANT:"
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)

        with torch.no_grad():
            out = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                eos_token_id=self.tokenizer.eos_token_id,
            )

        # Decode only the newly generated part when possible.
        gen_ids = out[0][inputs["input_ids"].shape[-1] :]
        text = self.tokenizer.decode(gen_ids, skip_special_tokens=True).strip()
        return text

