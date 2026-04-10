"use client";

import { useEffect, useState } from "react";

export function TypewriterText({ text, speed = 18, className = "" }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    let index = 0;
    setVisibleText("");

    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed]);

  return (
    <p className={className}>
      {visibleText}
      <span className="typewriter-caret" aria-hidden="true" />
    </p>
  );
}
