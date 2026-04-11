"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categories } from "../lib/assessmentData";
import { useCurrentUser } from "./useCurrentUser";

export function ResultsClient() {
  const [result, setResult] = useState(null);
  const [isRepairingAssessment, setIsRepairingAssessment] = useState(false);
  const repairAttemptedRef = useRef(false);
  const { status, isAuthenticated, user, refresh } = useCurrentUser();

  useEffect(() => {
    if (!result && user?.latestAssessment) {
      setResult(user.latestAssessment);
      return;
    }

    if (!result && user?.email) {
      try {
        const stored = JSON.parse(window.localStorage.getItem("albi-trust-assessment") || "null");
        const storedEmail = String(stored?.userEmail || "").toLowerCase();
        const userEmail = String(user.email || "").toLowerCase();

        if (storedEmail && storedEmail === userEmail && stored?.result) {
          setResult(stored.result);
        }
      } catch {
        setResult(null);
      }
    }
  }, [result, user]);

  useEffect(() => {
    if (!isAuthenticated || !result || user?.latestAssessmentAt || isRepairingAssessment) return;
    if (repairAttemptedRef.current) return;
    repairAttemptedRef.current = true;

    async function repairAssessmentRecord() {
      setIsRepairingAssessment(true);

      try {
        const response = await fetch("/api/assessment/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result }),
        });

        if (response.ok) {
          await refresh();
        }
      } finally {
        setIsRepairingAssessment(false);
      }
    }

    repairAssessmentRecord();
  }, [isAuthenticated, result, user?.latestAssessmentAt, isRepairingAssessment, refresh]);

  if (status === "loading") {
    return (
      <div className="result-shell">
        <div className="eyebrow">Assessment result</div>
        <h1 className="page-title">Loading your account.</h1>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="result-shell">
        <div className="eyebrow">Assessment result</div>
        <h1 className="page-title">Sign in to view your result.</h1>
        <p className="page-lead">
          Your assessment result is tied to your account so it stays private, saved, and available when you come back.
        </p>
        <div className="stack-actions">
          <Link href="/login?next=%2Fresults" className="button-primary">
            Sign in
          </Link>
          <Link href="/signup?next=%2Fresults" className="button-secondary">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-shell">
        <div className="eyebrow">No result yet</div>
        <h1 className="page-title">You have not taken the assessment yet.</h1>
        <p className="page-lead">
          Once you complete the assessment, your level, weakest area, and next tailored path will appear here.
        </p>
        <div className="stack-actions">
          <Link href="/assessment" className="button-primary">
            Take the assessment now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="result-shell">
      <div className="eyebrow">Assessment result</div>
      <div className="result-level-card">
        <span>Your trader level</span>
        <h1>{result.level.title}</h1>
      </div>
      <p className="page-lead">{result.level.summary}</p>

      <div className="mini-grid" style={{ marginTop: 28 }}>
        <div className="metric">
          <span>Overall trading level</span>
          <strong>{result.overallScore}/100</strong>
        </div>
        <div className="metric">
          <span>Main current blocker</span>
          <strong>{result.primaryWeakness.label}</strong>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 16 }}>
        Based on {result.totalQuestions} questions covering discipline, loss acceptance, risk, consistency, emotions, and preparation quality.
      </p>

      <div className="tag-row" style={{ marginTop: 18 }}>
        <span className="tag">Strongest area: {result.strongest.label}</span>
        <span className="tag">Secondary weakness: {result.secondaryWeakness.label}</span>
        <span className="tag">Next focus: {result.level.focus}</span>
      </div>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: "2.1rem" }}>
              Your score profile
            </h2>
            <p className="muted">This is where your current trading behavior is helping or hurting you most.</p>
          </div>
        </div>

        <div className="action-grid">
          {categories.map((category) => {
            const match = result.categoryScores.find((score) => score.key === category.key);
            const scoreValue = typeof match?.score === "number" ? match.score : 0;
            return (
              <div className="action-card" key={category.key}>
                <strong>{category.label}</strong>
                <p className="muted" style={{ margin: "0 0 12px" }}>
                  {category.description}
                </p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${scoreValue}%` }} />
                </div>
                <p style={{ marginTop: 12 }}>{scoreValue}/100</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="stack-actions" style={{ marginTop: 34 }}>
        {user?.hasPaidTailoredPlan ? (
          <Link href="/dashboard" className="button-primary">
            Go to paid member area
          </Link>
        ) : (
          <Link href="/tailored-intake" className="button-primary">
            Buy tailored action plan - $99
          </Link>
        )}
      </div>
    </div>
  );
}
