"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to send reset email.");
      }

      setNotice(data.message || "If an account exists for this email, a reset link has been sent.");
    } catch (submitError) {
      setError(submitError.message || "Unable to send reset email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-form-card">
        <Link href="/" className="auth-brand-center auth-brand-home-link">
          <span className="brand-mark brand-mark-image brand-mark-auth" aria-hidden="true">
            <img src="/brand/albitrust-face-symbol.png" alt="" />
          </span>
          <span className="auth-brand-center-text">Albi Trust</span>
        </Link>

        <h1 className="auth-title auth-title-centered">Reset your password</h1>
        <p className="auth-subtitle auth-subtitle-centered">
          Enter your email and we will send you a reset link.
        </p>

        <form className="auth-fields" onSubmit={handleSubmit}>
          <label className="form-field form-field-full">
            <span className="auth-field-label">Email address</span>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}
          {notice ? <p className="auth-notice">{notice}</p> : null}

          <button type="submit" className="button-primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="auth-inline-link">
          <Link href="/login">Back to login</Link>
        </div>
      </div>
    </section>
  );
}
