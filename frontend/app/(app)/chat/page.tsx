import Conversation from "@/components/conversation/Conversation";
import styles from "@/styles/voice-session.module.css";

export default function ChatPage() {
  return (
    <div className={styles.voiceAppWrap}>
      <Conversation />
    </div>
  );
}
