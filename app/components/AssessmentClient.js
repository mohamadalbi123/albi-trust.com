"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { answerOptions, evaluateAnswers, questions } from "../lib/assessmentData";
import { useCurrentUser } from "./useCurrentUser";

export function AssessmentClient() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPassword, setLeadPassword] = useState("");
  const [startError, setStartError] = useState("");
  const [startNotice, setStartNotice] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const router = useRouter();
  const { status, user, refresh } = useCurrentUser();

  const currentQuestion = questions[currentIndex];
  const completion = Math.round((Object.keys(answers).length / questions.length) * 100);
  const selectedValue = answers[currentQuestion.id];

  const canContinue = typeof selectedValue === "number";
  const isLastQuestion = currentIndex === questions.length - 1;

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedLead = window.localStorage.getItem("albi-trust-user-profile");
    if (savedLead) {
      try {
        const parsed = JSON.parse(savedLead);
        setLeadName(parsed.name || "");
        setLeadEmail(parsed.email || "");
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLeadName(user.fullName || "");
    setLeadEmail(user.email || "");
    if (user.nextAssessmentAt && new Date(user.nextAssessmentAt) > new Date()) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
  }, [user]);

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

  async function handleStart() {
    const trimmedName = leadName.trim();
    const trimmedEmail = leadEmail.trim().toLowerCase();

    if (user) {
      setHasStarted(true);
      return;
    }

    if (!trimmedName || !trimmedEmail || !leadPassword.trim()) {
      setStartError("Please enter your full name, email, and password before starting.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setStartError("Please enter a valid email address.");
      return;
    }

    if (leadPassword.trim().length < 8) {
      setStartError("Password should be at least 8 characters.");
      return;
    }

    setStartError("");
    setStartNotice("");
    setVerifyUrl("");

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: trimmedName,
        email: trimmedEmail,
        password: leadPassword,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setStartError(data.error || "Unable to create account.");
      return;
    }

    window.localStorage.setItem(
      "albi-trust-user-profile",
      JSON.stringify({
        name: trimmedName,
        email: trimmedEmail,
      }),
    );

    setStartNotice("Account created. Confirm your email before you can start the assessment.");
    setVerifyUrl(data.verifyUrl || "");
  }

  if (isLocked) {
    return (
      <div className="assessment-shell">
        <div className="eyebrow">Assessment locked</div>
        <h1 className="page-title">This assessment is locked for now.</h1>
        <p className="page-lead">
          Your account already has a completed assessment. Retakes are available every 1 month so the result stays meaningful.
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
          <Link href="/login" className="button-secondary">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hasStarted ? (
        <div className="assessment-start-overlay">
          <div className="assessment-start-modal">
            <div className="eyebrow">Before you begin</div>
            <h1 className="page-title assessment-start-title">
              {user ? "You can take this assessment now." : "Create your account before you begin."}
            </h1>
            <p className="page-lead">
              {user
                ? "Set aside around 30 to 60 minutes and answer honestly so the result actually means something."
                : "Enter your details to create your account and begin the assessment flow."}
            </p>

            {!user ? (
              <div className="assessment-start-form">
                <label className="form-field form-field-full">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={leadName}
                    onChange={(event) => setLeadName(event.target.value)}
                    onInput={(event) => setLeadName(event.currentTarget.value)}
                  />
                </label>

                <label className="form-field form-field-full">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={leadEmail}
                    onChange={(event) => setLeadEmail(event.target.value)}
                    onInput={(event) => setLeadEmail(event.currentTarget.value)}
                  />
                </label>

                <label className="form-field form-field-full">
                  <input
                    type="password"
                    placeholder="Create password"
                    value={leadPassword}
                    onChange={(event) => setLeadPassword(event.target.value)}
                    onInput={(event) => setLeadPassword(event.currentTarget.value)}
                  />
                </label>
              </div>
            ) : null}

            {startError ? <p className="start-error">{startError}</p> : null}
            {verifyUrl ? (
              <div className="auth-dev-preview" style={{ marginTop: 14 }}>
                <strong>Confirm your email</strong>
                <p className="muted">
                  Check your inbox or spam folder. In this local build, use the preview link below to confirm your email now.
                </p>
                <Link href={verifyUrl}>Confirm email now</Link>
              </div>
            ) : null}

            <div className="stack-actions">
              <button
                type="button"
                className="button-primary"
                onClick={handleStart}
              >
                Start the test if you are ready
              </button>
              <Link href="/" className="button-secondary">
                Go back
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`assessment-shell ${!hasStarted ? "assessment-shell-blurred" : ""}`}>
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
        </div>
      </div>
    </>
  );
}
