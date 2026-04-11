"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "./useCurrentUser";

export function SiteHeader() {
  const router = useRouter();
  const { status, isAuthenticated } = useCurrentUser();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          <span className="brand-mark-glyph">AT</span>
        </span>
        <span>Albi Trust</span>
      </Link>

      <nav className="nav-links">
        <Link href="/assessment">Assessment</Link>
        {status === "loading" ? null : isAuthenticated ? <Link href="/results">Results</Link> : null}
        {status === "loading" ? null : isAuthenticated ? <Link href="/dashboard">Dashboard</Link> : null}
        {status === "loading" ? null : isAuthenticated ? (
          <button type="button" className="nav-link-button" onClick={handleLogout}>
            Sign out
          </button>
        ) : (
          <Link href="/login">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
