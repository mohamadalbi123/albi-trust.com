"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

function formatDate(value) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRetakeStatus(value) {
  if (!value) return "Available now.";

  const nextDate = new Date(value);
  if (nextDate <= new Date()) {
    return "Available now.";
  }

  return `Locked until ${formatDate(value)}.`;
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
  const [showPasswordForm, setShowPasswordForm] = useState(false);

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
          <Link href="/login" className="button-primary">
            Sign in
          </Link>
          <Link href="/signup" className="button-secondary">
            Create account
          </Link>
        </div>
      </section>
    );
  }

  const retakeLocked = user.nextAssessmentAt && new Date(user.nextAssessmentAt) > new Date();
  const traderLevel = user.latestAssessment?.level?.title || "Not available yet";

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
      <div className="eyebrow">Account dashboard</div>
      <h1 className="page-title">Welcome back{user.fullName ? `, ${user.fullName}.` : "."}</h1>
      <p className="page-lead">
        {searchParams.get("verified") === "1"
          ? "Your email is confirmed and your account is ready."
          : "Your account keeps your assessment history, retake date, and next best path together."}
      </p>

      {newOrderId ? (
        <p className="auth-notice" style={{ marginTop: 18 }}>
          Your tailored action-plan order was submitted successfully. Order ID: {newOrderId}
        </p>
      ) : null}

      <div className="action-grid" style={{ marginTop: 28 }}>
        <div className="action-card">
          <strong>Assessment completed</strong>
          <p className="muted">{formatDate(user.latestAssessmentAt)}</p>
        </div>

        <div className="action-card">
          <strong>Next eligible retake</strong>
          <p className="muted">{formatDate(user.nextAssessmentAt)}</p>
        </div>

        <div className="action-card">
          <strong>Retake status</strong>
          <p className="muted">{formatRetakeStatus(user.nextAssessmentAt)}</p>
        </div>
      </div>

      <div className="action-grid" style={{ marginTop: 18 }}>
        <div className="action-card">
          <strong>Assessment</strong>
          <p className="muted">
            {retakeLocked
              ? `Your current result remains saved. You can retake the assessment again from ${formatDate(user.nextAssessmentAt)}.`
              : "You can continue into the assessment when you are ready."}
          </p>
          <div className="stack-actions">
            <Link href="/assessment" className="button-primary">
              {retakeLocked ? "View assessment status" : "Take assessment"}
            </Link>
          </div>
        </div>

        <div className="action-card">
          <strong>Tailored action plan</strong>
          <p className="muted">
            {user.hasPaidTailoredPlan
              ? `Paid access confirmed${user.latestPaidOrderAt ? ` on ${formatDate(user.latestPaidOrderAt)}` : ""}.`
              : "Buy your personalized tailored action plan and complete the extra intake after payment."}
          </p>
          <div className="stack-actions">
            {user.hasPaidTailoredPlan ? (
              <span className="button-secondary" aria-disabled="true">
                Unlocked
              </span>
            ) : (
              <Link href="/tailored-intake" className="button-primary">
                Buy now for $99
              </Link>
            )}
          </div>
        </div>

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
              <strong>{user.fullName || "Not set"}</strong>
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
