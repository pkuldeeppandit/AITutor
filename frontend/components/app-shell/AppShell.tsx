"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import styles from "./AppShell.module.css";

function IconSearch() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 12a7 7 0 01-7 7H8l-5 3 2-4a7 7 0 117-6z" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" strokeLinecap="round" />
    </svg>
  );
}

const links = [
  { href: "/explore", label: "Explore", Icon: IconSearch },
  { href: "/chat", label: "Voice", Icon: IconChat },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.add("app-shell-active");
    return () => document.body.classList.remove("app-shell-active");
  }, []);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar} aria-label="Main">
        <Link href="/explore" className={styles.logo}>
          <Image
            src="/Cartoon-Robot.png"
            alt=""
            width={36}
            height={36}
            className={styles.logoMark}
          />
          AI Tutor
        </Link>
        <nav className={styles.nav}>
          {links.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${active(href) ? styles.navLinkActive : ""}`}
            >
              <Icon />
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className={`${styles.navLink} ${pathname === "/login" || pathname === "/register" ? styles.navLinkActive : ""}`}
          >
            <IconUser />
            Account
          </Link>
        </nav>
        <div className={styles.spacer} />
      </aside>

      <main className={styles.main}>{children}</main>

      <nav className={styles.bottomNav} aria-label="Mobile">
        <Link
          href="/explore"
          className={`${styles.bottomLink} ${pathname === "/explore" ? styles.bottomLinkActive : ""}`}
          aria-label="Explore"
        >
          <IconSearch />
        </Link>
        <Link href="/chat" className={styles.bottomFab} aria-label="Voice chat">
          <IconChat />
        </Link>
        <Link
          href="/login"
          className={`${styles.bottomLink} ${pathname === "/login" ? styles.bottomLinkActive : ""}`}
          aria-label="Account"
        >
          <IconUser />
        </Link>
      </nav>
    </div>
  );
}
