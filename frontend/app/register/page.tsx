"use client";

import Link from "next/link";
import { useState } from "react";
import auth from "@/styles/auth.module.css";
import AuthArtHero from "@/components/auth/AuthArtHero";

function EyeIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.5 10.5a3 3 0 004 4M9.88 9.88a3 3 0 014.24 4.24M6.34 6.34C8.5 4.5 10.5 3 12 3c5 0 9 7 9 9a17.6 17.6 0 01-2.29 3.7M4 4c-2.5 3.5-4 7-4 8 0 2 4 9 12 9 1.8 0 3.5-.4 5-1"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export default function RegisterPage() {
  const [show, setShow] = useState(false);

  return (
    <div className={auth.wrap}>
      <div className={auth.split}>
        <div className={`${auth.art} ${auth.artHiddenMobile}`}>
          <AuthArtHero />
        </div>
        <div className={auth.card}>
          <Link href="/" className={auth.back}>
            ← Back
          </Link>
          <h1 className={auth.title}>Create an account</h1>
          <p className={auth.sub}>
            Already have an account? <Link href="/login">Login</Link>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className={auth.field}>
              <input className={auth.input} type="email" name="email" placeholder="Email address" autoComplete="email" />
            </div>
            <div className={`${auth.field} ${auth.passwordRow}`}>
              <input
                className={auth.input}
                type={show ? "text" : "password"}
                name="password"
                placeholder="Password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className={auth.eye}
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                <EyeIcon off={show} />
              </button>
            </div>
            <Link href="/explore" className={auth.btnPrimary}>
              Continue
            </Link>
          </form>
          <div className={auth.divider}>or sign up with</div>
          <div className={auth.socialRow}>
            <button type="button" className={auth.socialBtn} aria-label="Google">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </button>
            <button type="button" className={auth.socialBtn} aria-label="Apple">
              <svg width="18" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
            </button>
            <button type="button" className={auth.socialBtn} aria-label="Facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
          </div>
          <p className={auth.legal}>
            By clicking create account you agree to AI Tutor{" "}
            <a href="#">Terms of use</a> and <a href="#">Privacy policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
