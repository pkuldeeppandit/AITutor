"use client";

import Conversation from "./components/Conversation";
import styles from "./page.module.css";

/**
 * Voice UI: WebRTC to FastAPI `POST /offer` (see `Conversation.tsx`).
 */
export default function HomePage() {
  return (
    <main className={styles.voiceAppMain}>
      <Conversation />
    </main>
  );
}
