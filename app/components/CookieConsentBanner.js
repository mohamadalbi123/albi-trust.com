"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "albi-trust-cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== "accepted") {
      setVisible(true);
    }
  }, []);

  function acceptCookies() {
    window.localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-banner__copy">
        <strong>Cookie notice</strong>
        <p>
          Albi Trust uses cookies and similar storage to keep the website working, remember your session, and improve the product experience. By continuing, you accept this use.
        </p>
      </div>
      <div className="cookie-banner__actions">
        <Link href="/cookies" className="button-secondary">
          Read cookie policy
        </Link>
        <button type="button" className="button-primary" onClick={acceptCookies}>
          Accept cookies
        </button>
      </div>
    </div>
  );
}
