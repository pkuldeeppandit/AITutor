import Image from "next/image";
import styles from "@/styles/landing.module.css";

/** Full-height hero — `bot.png` (3D mascot) */
export default function LandingHero() {
  return (
    <div className={styles.heroFigure}>
      <div className={styles.heroGlow} aria-hidden />
      <Image
        src="/bot.png"
        alt="AI Tutor mascot waving"
        width={560}
        height={640}
        className={styles.heroImg}
        priority
        sizes="(max-width: 900px) 85vw, 45vw"
      />
    </div>
  );
}
