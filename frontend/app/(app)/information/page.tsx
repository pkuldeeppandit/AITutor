import Link from "next/link";
import styles from "./information.module.css";

export default function InformationPage() {
  return (
    <section className={styles.shell}>
      <Link href="/explore" className={styles.back}>
        ← Back to Explore
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>Information</h1>
        <p className={styles.sub}>Helpful details about using AI Tutor effectively.</p>
      </header>

      <div className={styles.chatCard}>
        <div className={styles.chatThread}>
          <article className={`${styles.bubble} ${styles.bubbleBot}`}>
            Ask anything here: speaking practice tips, setup issues, prompts, or quick explanations.
          </article>
          <article className={`${styles.bubble} ${styles.bubbleUser}`}>
            How can I improve my confidence before a voice session?
          </article>
          <article className={`${styles.bubble} ${styles.bubbleBot}`}>
            Start with short 30-second responses, keep eye contact with the screen, and ask for
            one correction at a time.
          </article>
        </div>

        <form className={styles.chatComposer}>
          <label htmlFor="askAnything" className={styles.label}>
            Ask anything in chat
          </label>
          <textarea
            id="askAnything"
            className={styles.textarea}
            placeholder="Type your question..."
          />
          <div className={styles.row}>
            <button type="button" className={styles.btnPrimary}>
              Send
            </button>
            <button type="button" className={styles.btnGhost}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
