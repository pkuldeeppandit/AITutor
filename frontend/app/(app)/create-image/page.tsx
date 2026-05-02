import Image from "next/image";
import Link from "next/link";
import styles from "./create-image.module.css";

export default function CreateImagePage() {
  return (
    <section className={styles.shell}>
      <Link href="/explore" className={styles.back}>
        ← Back to Explore
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>Create Image</h1>
        <p className={styles.sub}>Describe what you want and generate an image concept.</p>
      </header>

      <div className={styles.card}>
        <label htmlFor="prompt" className={styles.label}>Prompt</label>
        <textarea
          id="prompt"
          className={styles.textarea}
          placeholder="Example: A futuristic classroom with neon blue lighting and a friendly AI robot tutor."
          defaultValue="Create an educational poster showing all types of tenses in English with clear labels and examples."
        />
        <div className={styles.row}>
          <button type="button" className={styles.btnPrimary}>Generate</button>
          <button type="button" className={styles.btnGhost}>Surprise me</button>
        </div>
      </div>

      <div className={styles.preview}>
        <div className={styles.previewInner}>
          <span className={styles.previewText}>
            Prompt: Create an educational poster showing all types of tenses.
          </span>
          <Image
            src="/tenses_image.png"
            alt="All types of tenses chart"
            width={680}
            height={980}
            className={styles.previewImg}
          />
          <span className={styles.previewText}>Generated image preview</span>
        </div>
      </div>
    </section>
  );
}
