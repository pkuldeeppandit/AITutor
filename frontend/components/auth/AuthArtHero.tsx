import Image from "next/image";
import auth from "@/styles/auth.module.css";

export default function AuthArtHero() {
  return (
    <div className={auth.artFigure}>
      <div className={auth.artGlow} aria-hidden />
      <Image
        src="/bot.png"
        alt="AI Tutor mascot"
        width={400}
        height={460}
        className={auth.artImg}
        priority
        sizes="(max-width: 880px) 0px, 340px"
      />
    </div>
  );
}
