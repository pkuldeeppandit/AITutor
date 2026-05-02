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

export default function LoginPage() {
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
          <h1 className={auth.title}>Welcome Back TO AI Tutor</h1>
          <p className={auth.sub}>Sign in to continue your learning journey.</p>
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
                autoComplete="current-password"
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
            <div className={auth.rowBetween}>
              <label className={auth.checkbox}>
                <input type="checkbox" name="remember" />
                Remember me
              </label>
              <a href="#">Forgot Password?</a>
            </div>
            <Link href="/explore" className={auth.btnPrimary}>
              Log in
            </Link>
          </form>
          <p className={auth.sub} style={{ marginTop: 24, marginBottom: 0, textAlign: "center" }}>
            New to AI Tutor? <Link href="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
