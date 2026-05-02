import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AI Tutor",
  description: "Improve your skills with real-time voice conversations",
  icons: {
    icon: "/Cartoon-Robot.png",
    apple: "/Cartoon-Robot.png"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
