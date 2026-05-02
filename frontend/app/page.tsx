import Link from "next/link";
import Image from "next/image";
import BrandMark from "@/components/brand/BrandMark";
import LandingHero from "@/components/landing/LandingHero";
import LandingSlider from "@/components/landing/LandingSlider";
import styles from "@/styles/landing.module.css";

export default function LandingPage() {
  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.brand}>
          <BrandMark size={44} className={styles.brandIcon} priority />
          <span className={styles.brandName}>AI Tutor</span>
        </Link>
        <Link href="/login" className={styles.topLink}>
          Sign in
        </Link>
      </header>

      <div className={styles.inner}>
        <div className={styles.copy}>
          <LandingSlider />
        </div>

        <div className={styles.heroArt}>
          <LandingHero />
          <div className={styles.heroSticker} aria-hidden>
            <Image src="/Cartoon-Robot.png" alt="" width={72} height={72} className={styles.stickerImg} />
          </div>
        </div>
      </div>

      <p className={styles.footerNote}>
        Already exploring?{" "}
        <Link href="/explore">Continue to Explore</Link>
      </p>
    </div>
  );
}
