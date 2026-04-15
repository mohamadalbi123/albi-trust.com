"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TypewriterText } from "./TypewriterText";

const POPUP_SESSION_KEY = "albitrust-home-visit-popup-seen";
const POPUP_DELAY_MS = 9000;
const POPUP_COPY =
  "When we go to a doctor, we do not all receive the same prescription, because not everyone is suffering from the same pain. Trading is no different. One trader may struggle with overtrading, while another struggles with fear of execution. Albi Trust is here to study your exact pain and give you a more tailored prescription.";

export function HomeVisitPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(POPUP_SESSION_KEY) === "1") {
        return;
      }
    } catch {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsVisible(true);
      try {
        window.sessionStorage.setItem(POPUP_SESSION_KEY, "1");
      } catch {}
    }, POPUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsVisible(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="assessment-start-overlay home-visit-popup-overlay" onClick={() => setIsVisible(false)} role="presentation">
      <div className="assessment-start-modal home-visit-popup" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Albi Trust introduction">
        <button type="button" className="home-visit-popup-close" onClick={() => setIsVisible(false)} aria-label="Close popup">
          Close
        </button>
        <div className="eyebrow">A more tailored diagnosis</div>
        <h2 className="page-title home-visit-popup-title">Not every trader is blocked by the same problem.</h2>
        <TypewriterText text={POPUP_COPY} speed={16} className="home-visit-popup-copy" />
        <p className="home-visit-popup-note">
          <strong>This is what Albi Trust is all about.</strong>
        </p>
        <div className="stack-actions home-visit-popup-actions">
          <Link href="/assessment" className="button-primary" onClick={() => setIsVisible(false)}>
            Take the free assessment
          </Link>
        </div>
      </div>
    </div>
  );
}
