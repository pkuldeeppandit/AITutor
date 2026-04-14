import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Speech-to-Speech Tutor",
  description: "Voice in, voice out — WebRTC to local FastAPI / Pipecat"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scanlines" aria-hidden />
        {children}
      </body>
    </html>
  );
}
