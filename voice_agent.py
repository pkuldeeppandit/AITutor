import asyncio
import re
import shutil
import subprocess
import sys
import time
import sounddevice as sd
import numpy as np
import whisper
import ollama
from scipy.io.wavfile import write

# 🔥 better model (tiny → fast but inaccurate)
model = whisper.load_model("small")

_pyttsx3_engine = None


def _plain_for_tts(text: str) -> str:
    """Strip markdown-ish noise so `say` / TTS doesn't read asterisks aloud."""
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    t = re.sub(r"\*([^*]+)\*", r"\1", t)
    t = t.replace("`", "")
    return t.strip()


def _speak_pyttsx3(text: str) -> None:
    global _pyttsx3_engine
    import pyttsx3

    if _pyttsx3_engine is None:
        _pyttsx3_engine = pyttsx3.init()
        _pyttsx3_engine.setProperty("rate", 180)
    _pyttsx3_engine.say(text)
    _pyttsx3_engine.runAndWait()

def record_audio(duration=8, fs=16000):
    print("🎤 Speak now...")
    
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()
    
    write("input.wav", fs, recording)
    return "input.wav"

def speak(text, pause_after: float = 2.0):
    if not text or not str(text).strip():
        return
    text = _plain_for_tts(str(text))
    if not text:
        return
    print("🤖:", text)

    used_say = False
    # macOS: system `say` uses the normal output device; pyttsx3 often fights PortAudio / mic capture.
    if sys.platform == "darwin":
        try:
            subprocess.run(
                ["/usr/bin/say", "-r", "185", "--", text],
                check=True,
                timeout=120,
            )
            used_say = True
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            pass
    else:
        say_ex = shutil.which("say")
        if say_ex:
            try:
                subprocess.run(
                    [say_ex, "-r", "185", "--", text],
                    check=True,
                    timeout=120,
                )
                used_say = True
            except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
                pass

    if not used_say:
        _speak_pyttsx3(text)

    if pause_after > 0:
        time.sleep(pause_after)

async def main():
    print("🚀 Voice Agent Started (say 'exit' to stop)\n")
    speak(
        "Hi! I'm your English tutor. How can I assist you today? "
        "You can ask about vocabulary, grammar, or practice a sentence."
    )

    while True:
        audio_file = record_audio()

        # 🎯 Speech to text
        print("📝 Transcribing… (please wait)\n", flush=True)
        result = model.transcribe(audio_file, language="en")
        user_text = result["text"].strip()

        # ❌ skip garbage input
        if not user_text or len(user_text) < 2:
            print("⚠️ Didn't catch that, try again...\n")
            continue

        print("🧑:", user_text)

        if "exit" in user_text.lower():
            speak("Goodbye!")
            break

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a friendly English tutor helping the user improve their language skills. "
                    "Focus on: (1) vocabulary—explain words, suggest better choices, and give short examples; "
                    "(2) sentences—help them form clear, natural sentences; "
                    "(3) grammar—gently correct mistakes and briefly say why; "
                    "(4) communication—tone, clarity, and polite or appropriate phrasing for the situation. "
                    "When they ask a general question, answer helpfully but also note one language tip if relevant. "
                    "Keep replies concise and easy to follow when spoken aloud (2–4 short sentences unless they ask for detail)."
                ),
            },
            {"role": "user", "content": user_text},
        ]

        try:
            # 🤖 LLM response (blocking call off the async loop; user hears + sees wait cue)
            print("⏳ Tutor is thinking… Please wait for the reply.\n", flush=True)
            speak("One moment.", pause_after=0.35)
            response = await asyncio.to_thread(
                ollama.chat,
                model="llama3.2",
                messages=messages,
            )
            reply = response["message"]["content"].strip()

        except Exception as e:
            print("❌ LLM Error:", e)
            reply = "Sorry, I couldn't process that."

        # 🔊 Speak
        speak(reply)
        print()

if __name__ == "__main__":
    asyncio.run(main())