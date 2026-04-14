"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

function formatDate(value) {
  if (!value) return "Not completed yet";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRetakeStatus(value) {
  if (!value) return "Available after your first completed assessment.";

  const nextDate = new Date(value);
  if (nextDate <= new Date()) {
    return "Available now.";
  }

  return `Locked for 30 days. Available again on ${formatDate(value)}.`;
}

function displayNameForUser(user) {
  const fullName = String(user?.fullName || "").trim();
  const emailPrefix = String(user?.email || "").split("@")[0];

  if (!fullName || fullName === emailPrefix) {
    return "";
  }

  return fullName;
}

function actionPlanStatusText(status) {
  if (status === "ready") return "Delivered";
  if (status === "final_review") return "Final review in progress";
  return "Under preparation";
}

export function DashboardClient() {
  const searchParams = useSearchParams();
  const { status, user, refresh } = useCurrentUser();
  const newOrderId = searchParams.get("order");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isRepairingAssessment, setIsRepairingAssessment] = useState(false);
  const [showDeliveryReason, setShowDeliveryReason] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const repairAttemptedRef = useRef(false);

  useEffect(() => {
    if (status !== "ready" || !user || user.latestAssessmentAt || repairAttemptedRef.current) return;

    let storedResult = null;

    try {
      const stored = JSON.parse(window.localStorage.getItem("albi-trust-assessment") || "null");
      const storedEmail = String(stored?.userEmail || "").toLowerCase();
      const userEmail = String(user.email || "").toLowerCase();
      storedResult = storedEmail && storedEmail === userEmail ? stored?.result : null;
    } catch {
      storedResult = null;
    }

    if (!storedResult) return;

    repairAttemptedRef.current = true;

    async function repairAssessmentRecord() {
      setIsRepairingAssessment(true);

      try {
        const response = await fetch("/api/assessment/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: storedResult }),
        });

        if (response.ok) {
          await refresh();
        }
      } catch {
        // Ignore malformed local recovery data.
      } finally {
        setIsRepairingAssessment(false);
      }
    }

    repairAssessmentRecord();
  }, [status, user, refresh]);

  if (status === "loading") {
    return (
      <section className="result-shell">
        <div className="eyebrow">Account dashboard</div>
        <h1 className="page-title">Loading your account.</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Account dashboard</div>
        <h1 className="page-title">Sign in to see your account.</h1>
        <p className="page-lead">
          Your saved assessment, retake date, and account path live here once you are signed in.
        </p>
        <div className="stack-actions">
          <Link href="/login?next=%2Fdashboard" className="button-primary">
            Sign in
          </Link>
          <Link href="/signup?next=%2Fdashboard" className="button-secondary">
            Create account
          </Link>
        </div>
      </section>
    );
  }

  const retakeLocked = user.nextAssessmentAt && new Date(user.nextAssessmentAt) > new Date();
  const traderLevel = user.latestAssessment?.level?.title || "Not available yet";
  const displayName = displayNameForUser(user);
  const actionPlanOrder = user.latestActionPlanOrder || null;

  async function handlePasswordChange(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setIsSavingPassword(true);

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || "Unable to update password.");
        setIsSavingPassword(false);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setPasswordSuccess("Password updated successfully.");
      await refresh();
    } catch {
      setPasswordError("Unable to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <section className="result-shell">
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">Account dashboard</div>
          <h1 className="page-title">
            {searchParams.get("verified") === "1" ? "Your account is ready." : `Welcome back${displayName ? `, ${displayName}.` : "."}`}
          </h1>
          <p className="page-lead">
            {searchParams.get("verified") === "1"
              ? "Your email is confirmed and your account is ready."
              : isRepairingAssessment
                ? "Restoring your saved assessment status."
                : "Your account keeps your assessment history, retake date, and next best path together."}
          </p>
        </div>

        <div className="dashboard-hero-panel">
          <span>Trader level</span>
          <strong>{traderLevel}</strong>
          <p>{user.latestAssessmentAt ? `Assessment completed ${formatDate(user.latestAssessmentAt)}` : "Assessment not completed yet"}</p>
        </div>
      </div>

      {newOrderId ? (
        <p className="auth-notice" style={{ marginTop: 18 }}>
          Your payment is confirmed. Your action plan is now under preparation.
        </p>
      ) : null}

      <div className="dashboard-status-row" style={{ marginTop: 28 }}>
        <div className="dashboard-status-item">
          <span>Assessment completed</span>
          <p className="muted">{formatDate(user.latestAssessmentAt)}</p>
        </div>

        <div className="dashboard-status-item">
          <span>Next eligible retake</span>
          <p className="muted">{user.latestAssessmentAt ? formatDate(user.nextAssessmentAt) : "Complete your first assessment to start the 30-day timer."}</p>
        </div>

        <div className="dashboard-status-item">
          <span>Retake status</span>
          <p className="muted">{formatRetakeStatus(user.nextAssessmentAt)}</p>
        </div>
      </div>

      <div className="dashboard-main-grid" style={{ marginTop: 18 }}>
        <div className="action-card dashboard-assessment-card">
          <strong>Assessment</strong>
          <p className="muted">
            {retakeLocked
              ? `Your current result remains saved. A new assessment is locked until ${formatDate(user.nextAssessmentAt)}.`
              : user.latestAssessmentAt
                ? "Your 30-day lock has ended. You can retake the assessment when you are ready."
                : "You can take your first assessment when you are ready."}
          </p>
          <div className="stack-actions">
            <Link href={retakeLocked ? "/results" : "/assessment"} className="button-primary">
              {retakeLocked ? "View my results" : "Take assessment"}
            </Link>
          </div>
        </div>

        {actionPlanOrder ? (
          <div className="action-card action-plan-status-card">
            <div className="status-card-heading">
              <strong>Your Action Plan</strong>
              <span className={`status-pill status-pill-${actionPlanOrder.status}`}>
                {actionPlanStatusText(actionPlanOrder.status)}
              </span>
            </div>
            <p className="muted">
              {actionPlanOrder.status === "ready"
                ? "Your personal action plan has been delivered."
                : actionPlanOrder.status === "final_review"
                  ? "Your personal action plan is in final review. It will appear here as soon as the PDF is uploaded."
                  : "We received your payment and are preparing your personal action plan based on your assessment and intake answers."}
            </p>
            <div className="mini-grid" style={{ marginTop: 16 }}>
              <div className="metric action-plan-date-metric">
                <span>Purchased on</span>
                <strong>{formatDate(actionPlanOrder.purchasedAt)}</strong>
              </div>
              <div className="metric action-plan-date-metric">
                <span>
                  Estimated ready
                  <button
                    type="button"
                    className="delivery-why-button"
                    onClick={() => setShowDeliveryReason((prev) => !prev)}
                    aria-expanded={showDeliveryReason}
                  >
                    Why?
                  </button>
                </span>
                <strong>{formatDate(actionPlanOrder.estimatedReadyAt)}</strong>
              </div>
            </div>
            {showDeliveryReason ? (
              <p className="delivery-reason">
                We study your case carefully before writing the action plan. This includes your assessment answers, trading profile, strategy notes, screenshots, and the information you shared at checkout. A useful plan needs careful review and clear thinking, not a rushed one-hour template.
              </p>
            ) : null}
            <div className="stack-actions" style={{ marginTop: 16 }}>
              {actionPlanOrder.downloadUrl ? (
                <a href={`/api/action-plans/${actionPlanOrder.id}/download`} target="_blank" rel="noreferrer" className="button-primary">
                  Open report
                </a>
              ) : (
                <span className="button-secondary disabled-button" aria-disabled="true">
                  Report ready soon
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="action-card">
            <strong>Tailored action plan</strong>
            <p className="muted">Buy your personalized tailored action plan and complete the extra intake after payment.</p>
            <div className="stack-actions">
              <Link href="/tailored-intake" className="button-primary">
                Buy now for $99
              </Link>
            </div>
          </div>
        )}

        <div className="action-card account-settings-card">
          <strong>Account settings</strong>
          <p className="muted">Your account details and password settings live here.</p>
          <div className="mini-grid account-settings-metrics" style={{ marginTop: 16 }}>
            <div className="metric">
              <span>Trader level</span>
              <strong>{traderLevel}</strong>
            </div>
            <div className="metric">
              <span>User ID</span>
              <strong>{user.id}</strong>
            </div>
            <div className="metric">
              <span>Name</span>
              <strong>{displayName || "Not set"}</strong>
            </div>
            <div className="metric">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
          </div>

          <div className="stack-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setShowPasswordForm((prev) => !prev)}
            >
              {showPasswordForm ? "Hide password form" : "Change password"}
            </button>
          </div>

          {showPasswordForm ? (
            <form className="auth-fields account-settings-form" style={{ marginTop: 16 }} onSubmit={handlePasswordChange}>
              <div className="auth-name-row">
                <label className="form-field">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>
              </div>
              {passwordError ? <p className="auth-error">{passwordError}</p> : null}
              {passwordSuccess ? <p className="auth-notice">{passwordSuccess}</p> : null}
              <div className="stack-actions">
                <button type="submit" className="button-primary" disabled={isSavingPassword}>
                  {isSavingPassword ? "Saving..." : "Update password"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
