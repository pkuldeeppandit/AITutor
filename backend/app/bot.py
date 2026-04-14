# bot.py — corrected for Mac Studio M4 Ultra
import asyncio
from pathlib import Path

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask

# Transport
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport

# VAD
from pipecat.audio.vad.silero import SileroVADAnalyzer

# STT — MLX Whisper (Apple Silicon native, no CUDA needed)
from pipecat.services.whisper.stt import WhisperSTTService, WhisperSTTServiceMLX, MLXModel, Model

# LLM — Ollama
from pipecat.services.ollama.llm import OLLamaLLMService

# TTS — Piper (local HTTP server)
from pipecat.services.piper.tts import PiperTTSService

# Context — use the NEW universal API (not deprecated OpenAI-specific one)
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext

# Trigger bot to speak first
from pipecat.frames.frames import LLMRunFrame

import aiohttp


async def run_bot(webrtc_connection: SmallWebRTCConnection):
    # Keep session alive for the whole pipeline lifetime
    session = aiohttp.ClientSession()

    try:
        # --- Transport ---
        transport = SmallWebRTCTransport(
            webrtc_connection=webrtc_connection,
            params=TransportParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                vad_analyzer=SileroVADAnalyzer(),
            ),
        )

        # --- STT: prefer MLX Whisper, fallback to faster-whisper if MLX deps missing ---
        try:
            import mlx_whisper  # noqa: F401

            stt = WhisperSTTServiceMLX(
                settings=WhisperSTTServiceMLX.Settings(
                    model=MLXModel.LARGE_V3_TURBO,   # fast + accurate on Apple Silicon
                    language="en",
                    temperature=0.0,
                ),
            )
        except ModuleNotFoundError:
            local_whisper_model_dir = Path("models/faster-whisper-base")
            whisper_model = (
                str(local_whisper_model_dir)
                if local_whisper_model_dir.exists()
                else Model.BASE.value
            )
            stt = WhisperSTTService(
                settings=WhisperSTTService.Settings(
                    model=whisper_model,
                    language="en",
                ),
            )

        # --- LLM: Ollama ---
        # Use "mistral" for speed, "qwen3:30b" for quality
        llm = OLLamaLLMService(
            settings=OLLamaLLMService.Settings(model="mistral"),
            base_url="http://localhost:11434/v1",
        )

        # --- TTS: Piper ---
        tts = PiperTTSService(
            settings=PiperTTSService.Settings(voice="en_US-amy-medium"),
            download_dir=Path("voices"),
        )

        # --- Context (current API, not deprecated) ---
        tutor_system = (
            "You are a warm, patient English conversation tutor. The user is practicing "
            "spoken English; you only see what they said as transcribed text.\n\n"
            "On each turn:\n"
            "- If something they said is unclear, ungrammatical, or unnatural, briefly give a "
            "corrected version (short phrase or full sentence as needed) and in one clause "
            "say what to fix—for example tense, article, word order, or a better collocation. "
            "Then answer their idea or continue the topic in a natural, friendly way.\n"
            "- If their English is already fine, do not invent mistakes—just talk with them "
            "normally.\n\n"
            "How you speak (this is read aloud):\n"
            "- Use about one to three short sentences per reply unless a tiny extra sentence "
            "is needed for a clear correction.\n"
            "- No bullet lists, numbered lists, headings, or markdown—only natural speech.\n"
            "- Sound encouraging, never condescending."
        )
        context = OpenAILLMContext(messages=[
            {"role": "system", "content": tutor_system},
        ])
        context_agg = llm.create_context_aggregator(context)
        user_agg = context_agg.user()
        assistant_agg = context_agg.assistant()

        # --- Pipeline ---
        pipeline = Pipeline([
            transport.input(),
            stt,
            user_agg,
            llm,
            tts,
            transport.output(),
            assistant_agg,
        ])

        task = PipelineTask(
            pipeline,
            params=PipelineParams(allow_interruptions=True),
        )

        # Trigger bot greeting on connect (correct way in current Pipecat)
        @transport.event_handler("on_client_connected")
        async def on_connected(transport, client):
            context.add_message({
                "role": "user",
                "content": (
                    "The session just started. Greet me as my English tutor in one or two "
                    "short sentences and invite me to say something in English so you can "
                    "chat and help with my grammar."
                ),
            })
            await task.queue_frames([LLMRunFrame()])

        runner = PipelineRunner()
        await runner.run(task)

    finally:
        await session.close()