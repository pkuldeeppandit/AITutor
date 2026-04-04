"use client";

import Image from "next/image";

type AnimatedBotProps = {
  isSpeaking: boolean;
  isRecording?: boolean;
  onTalkClick?: () => void;
  onStopClick?: () => void;
};

export function AnimatedBot({ isSpeaking, isRecording, onTalkClick, onStopClick }: AnimatedBotProps) {
  const barCount = 24;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className={`bot-container mobile-bot ${isSpeaking ? "bot-speaking" : "bot-idle"}`}>
      {/* Mobile phone frame */}
      <div className="mobile-frame">
        <div className="mobile-notch" />
        <div className="mobile-screen">
          {/* Waveform */}
          <div className="waveform">
            {bars.map((i) => (
              <div
                key={i}
                className="waveform-bar"
                style={{
                  animationDelay: `${(i % 8) * 0.02}s`,
                }}
              />
            ))}
          </div>

          {/* Bot avatar */}
          <div className="bot-image-wrapper">
            <Image
              src="/robot.png"
              alt="AI Voice Agent Bot"
              width={200}
              height={250}
              className="bot-image"
              priority
              unoptimized
            />
          </div>

          {/* Talk button */}
          <button
            type="button"
            className="bot-talk-btn"
            onClick={isRecording ? onStopClick : onTalkClick}
            disabled={isRecording ? false : !onTalkClick}
          >
            {isRecording ? "STOP" : "TALK"}
          </button>

          {/* Status indicator */}
          <div
            className={`bot-status ${isSpeaking ? "listening" : isRecording ? "listening" : "ready"}`}
          >
            {isSpeaking ? "Speaking…" : isRecording ? "Listening…" : "Ready"}
          </div>
        </div>
      </div>
    </div>
  );
}
