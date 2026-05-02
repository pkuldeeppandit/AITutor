"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "@/styles/landing.module.css";

const AUTO_MS = 5500;

const SLIDES = [
  {
    title: "Improve Your Skills via Real Conversations with AI Tutor",
    body: "Enhance your skills with real-world conversations designed to build confidence. Speak naturally and learn effectively."
  },
  {
    title: "Practice speaking without the pressure of a classroom",
    body: "Open a voice session anytime: your mic goes to the tutor, and you hear natural replies in real time — ideal for fluency and pronunciation."
  },
  {
    title: "Learn at your pace with goals that stay in focus",
    body: "Jump into Explore for tools and voice, then start a session when you are ready — no clutter, just conversation and practice."
  },
  {
    title: "Local, private-first tutoring on your machine",
    body: "Run the stack locally when you want full control over models and data — great for focused study sessions without leaving your desk."
  }
] as const;

export default function LandingSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, index]);

  const goTo = useCallback((i: number) => {
    setIndex(i);
  }, []);

  const slide = SLIDES[index];

  return (
    <div
      className={styles.sliderWrap}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={styles.slideViewport}
        role="region"
        aria-roledescription="carousel"
        aria-label="Onboarding highlights"
      >
        <div key={index} className={styles.slidePane}>
          <h1 className={styles.headline}>{slide.title}</h1>
          <p className={styles.lead}>{slide.body}</p>
        </div>
      </div>

      <div className={styles.dots} role="tablist" aria-label="Choose slide">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1} of ${SLIDES.length}`}
            className={`${styles.dotBtn} ${i === index ? styles.dotBtnActive : ""}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <Link href="/register" className={styles.btnRegister}>
          Register
        </Link>
        <Link href="/login" className={styles.btnSignIn}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
