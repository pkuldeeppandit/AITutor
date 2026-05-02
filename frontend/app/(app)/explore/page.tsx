import Image from "next/image";
import Link from "next/link";
import styles from "./explore.module.css";

const tools = [
  { label: "Translation", href: "/translate", icon: "globe" },
  { label: "Information", href: "/information", icon: "search" },
  { label: "Create Image", href: "/create-image", icon: "brush" }
] as const;

function Icon({ type }: { type: (typeof tools)[number]["icon"] | "mic" }) {
  const cls = styles.tileIcon;
  switch (type) {
    case "mic":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm6-3a6 6 0 01-12 0" strokeLinecap="round" />
          <path d="M12 19v3M8 22h8" strokeLinecap="round" />
        </svg>
      );
    case "globe":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 000 18M12 3a15 15 0 010 18" strokeLinecap="round" />
        </svg>
      );
    case "search":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" strokeLinecap="round" />
        </svg>
      );
    case "brush":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M4 20h4l10-10a2 2 0 00-3-3L5 17v3z" strokeLinejoin="round" />
          <path d="M13 6l5 5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ExplorePage() {
  return (
    <div className={styles.shell}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          <h1 className={styles.title}>Explore</h1>
          <p className={styles.sub}>
            Open a live voice session, translate text, read guidance, or draft image prompts from one place.
          </p>
        </div>
        <div className={styles.headerArt} aria-hidden>
          <Image src="/Cartoon-Robot.png" alt="" width={88} height={88} className={styles.headerMascot} />
        </div>
      </header>

      <Link href="/chat" className={styles.voiceCard}>
        <div className={styles.voiceCardIconWrap}>
          <Icon type="mic" />
        </div>
        <div className={styles.voiceCardBody}>
          <h2 className={styles.voiceCardTitle}>Voice tutor</h2>
          <p className={styles.voiceCardDesc}>
            WebRTC to your backend — microphone in, spoken replies out. Start when you are ready.
          </p>
        </div>
        <span className={styles.voiceCardCta}>Start session</span>
      </Link>

      <h2 className={styles.sectionHeading}>Tools</h2>
      <div className={styles.grid}>
        {tools.map((t) => (
          <Link key={t.label} href={t.href} className={styles.tile}>
            <Icon type={t.icon} />
            <span className={styles.tileLabel}>{t.label}</span>
            <span className={styles.tileHint}>Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
