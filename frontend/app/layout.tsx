import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AI Voice Agents",
  description: "The All-In-One Platform For Voice AI Agents And Everything Audio"
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
