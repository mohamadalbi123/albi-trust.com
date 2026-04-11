"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { answerOptions, evaluateAnswers, questions } from "../lib/assessmentData";
import { useCurrentUser } from "./useCurrentUser";

export function AssessmentClient() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showReadyPrompt, setShowReadyPrompt] = useState(false);
  const [startError, setStartError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, refresh } = useCurrentUser();

  const currentQuestion = questions[currentIndex];
  const completion = Math.round((Object.keys(answers).length / questions.length) * 100);
  const selectedValue = answers[currentQuestion.id];

  const canContinue = typeof selectedValue === "number";
  const isLastQuestion = currentIndex === questions.length - 1;

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "ready" && !user) {
      router.replace("/signup?next=%2Fassessment");
    }
  }, [router, status, user]);

  useEffect(() => {
    if (!user) return;
    if (user.nextAssessmentAt && new Date(user.nextAssessmentAt) > new Date()) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
  }, [user]);

  useEffect(() => {
    if (status === "ready" && user && searchParams.get("verified") === "1" && !user.latestAssessmentAt) {
      setShowReadyPrompt(true);
    }
  }, [searchParams, status, user]);

  function handleAnswer(value) {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }

  async function handleNext() {
    if (!canContinue) return;

    if (isLastQuestion) {
      const result = evaluateAnswers(answers);
      setIsSubmitting(true);
      window.localStorage.setItem("albi-trust-assessment", JSON.stringify(result));
      const response = await fetch("/api/assessment/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStartError(data.error || "Unable to save assessment.");
        setIsSubmitting(false);
        return;
      }

      await refresh();
      router.push("/results");
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  }

  function handleBack() {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }

  function handleStartAssessment() {
    setShowReadyPrompt(false);
    router.replace("/assessment");
  }

  if (status === "loading" || !user) {
    return (
      <div className="assessment-shell">
        <div className="eyebrow">Assessment</div>
        <h1 className="page-title">Create your account first.</h1>
        <p className="page-lead">
          We will send you to signup so your result can be saved and your assessment can continue from your account.
        </p>
        <div className="stack-actions">
          <Link href="/signup?next=%2Fassessment" className="button-primary">
            Create account
          </Link>
          <Link href="/login?next=%2Fassessment" className="button-secondary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="assessment-shell">
        <div className="eyebrow">Assessment locked</div>
        <h1 className="page-title">This assessment is locked for now.</h1>
        <p className="page-lead">
          Your account already has a completed assessment. You can retake it once every 30 days so the result stays meaningful.
        </p>

        <div className="action-grid" style={{ marginTop: 28 }}>
          <div className="action-card">
            <strong>Your current path</strong>
            <p className="muted">
              View your saved result and continue into the tailored action plan when you are ready.
            </p>
          </div>
          <div className="action-card">
            <strong>Next eligible retake</strong>
            <p className="muted">
              {user?.nextAssessmentAt
                ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(user.nextAssessmentAt),
                  )
                : "This date will appear here after your first completed assessment."}
            </p>
          </div>
        </div>

        <div className="stack-actions">
          <Link href="/results" className="button-primary">
            View my saved result
          </Link>
          <Link href="/dashboard" className="button-secondary">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {showReadyPrompt ? (
        <div className="assessment-start-overlay">
          <div className="assessment-start-modal">
            <div className="eyebrow">Email confirmed</div>
            <h1 className="page-title assessment-start-title">Ready to take the assessment?</h1>
            <p className="page-lead">
              Your account is ready. Start when you can answer honestly from your real trading behavior.
            </p>
            <div className="stack-actions">
              <button type="button" className="button-primary" onClick={handleStartAssessment}>
                Start assessment
              </button>
              <Link href="/dashboard" className="button-secondary">
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      <div className="assessment-shell">
        <div className="panel-label">
          <span>{questions.length}-question trading assessment</span>
          <span>{answeredCount}/{questions.length} answered</span>
        </div>

        <div className="progress-bar" style={{ marginTop: 16 }}>
          <div className="progress-fill" style={{ width: `${completion}%` }} />
        </div>

        <div className="question-card">
          <div className="eyebrow">Question {currentIndex + 1}</div>
          <h2 className="question-title">{currentQuestion.text}</h2>
          <p className="muted">
            Answer from real behavior: how you prepare, how you use your tools, how you manage risk, and what happens when emotions take over.
          </p>

          <div className="answer-grid">
            {answerOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`answer-option ${selectedValue === option.value ? "selected" : ""}`}
                onClick={() => handleAnswer(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="stack-actions">
            <button type="button" className="button-ghost" onClick={handleBack} disabled={currentIndex === 0}>
              Back
            </button>
            <button type="button" className="button-primary" onClick={handleNext} disabled={!canContinue || isSubmitting}>
              {isLastQuestion ? "See my result" : "Continue"}
            </button>
          </div>

          {startError ? <p className="start-error">{startError}</p> : null}
        </div>
      </div>
    </>
  );
}
