import Link from "next/link";
import styles from "./translate.module.css";

export default function TranslatePage() {
  return (
    <section className={styles.shell}>
      <Link href="/explore" className={styles.back}>
        ← Back to Explore
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>Translation</h1>
        <p className={styles.sub}>Translate short phrases quickly for practice sessions.</p>
      </header>

      <div className={styles.grid}>
        <article className={styles.card}>
          <label className={styles.label} htmlFor="sourceText">Source text</label>
          <textarea
            id="sourceText"
            className={styles.textarea}
            placeholder="Type text here..."
            defaultValue="Can you help me improve my spoken English?"
          />
          <div className={styles.langRow}>
            <span className={styles.badge}>English</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.badge}>Hindi</span>
          </div>
          <button type="button" className={styles.btnPrimary}>Translate</button>
        </article>

        <article className={styles.card}>
          <label className={styles.label}>Output</label>
          <p className={styles.output}>क्या आप मेरी अंग्रेजी बोलने की क्षमता को सुधारने में मेरी मदद कर सकते हैं?</p>
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost}>Copy</button>
            <button type="button" className={styles.btnGhost}>Speak</button>
          </div>
        </article>
      </div>
    </section>
  );
}
