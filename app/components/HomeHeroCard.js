"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function HomeHeroCard() {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState("translate3d(0, 72px, 0) scale(1.01) rotateX(0deg) rotateY(0deg)");

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY;
      const lift = Math.max(28, 72 - scrollY * 0.2);
      setTransform(`translate3d(0, ${lift}px, 0) scale(1.01) rotateX(0deg) rotateY(0deg)`);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handlePointerMove(event) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 7;
    const rotateX = (0.5 - py) * 5;
    const scrollLift = Math.max(28, 72 - window.scrollY * 0.2);

    setTransform(
      `translate3d(0, ${scrollLift}px, 0) scale(1.012) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
    );
  }

  function handlePointerLeave() {
    const scrollLift = typeof window === "undefined" ? 72 : Math.max(28, 72 - window.scrollY * 0.2);
    setTransform(`translate3d(0, ${scrollLift}px, 0) scale(1.01) rotateX(0deg) rotateY(0deg)`);
  }

  return (
    <div
      ref={cardRef}
      className="hero-copy hero-copy-minimal hero-interactive"
      style={{ transform }}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
    >
      <div className="eyebrow">Built from real trading experience</div>
      <h1>Find Out Exactly Why You're Not Profitable — and Fix It in 30 Days.</h1>
      <p>
        A serious assessment system for traders who want more structure, clearer self-awareness, and better execution.
      </p>

      <div className="hero-actions">
        <Link href="/assessment" className="button-primary">
          Start with free assessment
        </Link>
      </div>

      <div className="hero-metrics">
        <div className="hero-metric hero-metric-step-1">
          <strong>30</strong>
          <span>Questions</span>
        </div>
        <div className="hero-metric hero-metric-step-2">
          <strong>4</strong>
          <span>Trader levels</span>
        </div>
        <div className="hero-metric hero-metric-step-3">
          <strong>1</strong>
          <span>Clear next step</span>
        </div>
      </div>
    </div>
  );
}
