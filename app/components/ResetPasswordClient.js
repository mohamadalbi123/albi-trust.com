"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to reset password.");
      }

      setNotice("Password updated. Taking you to your dashboard.");
      window.setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (submitError) {
      setError(submitError.message || "Unable to reset password.");
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
        <p className="auth-subtitle auth-subtitle-centered">Choose a new password for your Albi Trust account.</p>

        {!token ? <p className="auth-error">This reset link is missing a token.</p> : null}

        <form className="auth-fields" onSubmit={handleSubmit}>
          <label className="form-field form-field-full">
            <span className="auth-field-label">New password</span>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}
          {notice ? <p className="auth-notice">{notice}</p> : null}

          <button type="submit" className="button-primary auth-submit" disabled={!token || isSubmitting}>
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </section>
  );
}
