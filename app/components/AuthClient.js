"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthClient({ mode = "login" }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verifiedStatus = searchParams.get("verified");
  const googleStatus = searchParams.get("google");
  const nextPath = searchParams.get("next") || "";
  const safeNextPath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "";
  const authSwitchQuery = safeNextPath ? `?next=${encodeURIComponent(safeNextPath)}` : "";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setVerifyUrl("");
    setEmailSent(false);
    setIsSubmitting(true);

    try {
      if (isSignup) {
        if (!agree) {
          throw new Error("Please agree to the Terms of Use and Privacy Policy.");
        }

        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, password, returnTo: safeNextPath }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to create account.");
        }

        setEmailSent(Boolean(data.emailSent));
        setNotice(
          data.emailSent
            ? "Confirm your email in your inbox or spam folder. The link will bring you back to start the assessment."
            : data.emailError
              ? `Account created, but the confirmation email was not sent: ${data.emailError}`
              : "Account created, but the confirmation email was not sent.",
        );
        setVerifyUrl(data.verifyUrl || "");
      } else {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        if (!response.ok) {
          setVerifyUrl(data.verifyUrl || "");
          throw new Error(data.error || "Unable to sign in.");
        }

        router.push(safeNextPath || "/dashboard");
        router.refresh();
      }
    } catch (submitError) {
      setError(submitError.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-form-card">
        <Link href="/" className="auth-brand-center auth-brand-home-link">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark-glyph">AT</span>
          </span>
          <span className="auth-brand-center-text">Albi Trust</span>
        </Link>

        <h1 className="auth-title auth-title-centered">{isSignup ? "Create your account" : "Sign in to your account"}</h1>
        <p className="auth-subtitle auth-subtitle-centered">
          {isSignup
            ? "Create your account to save your result and continue to the assessment."
            : "Sign in to view your saved assessment, retake date, and member area."}
        </p>

        {verifiedStatus === "1" ? (
          <p className="auth-notice">Your email is confirmed. You can continue now.</p>
        ) : null}
        {verifiedStatus === "invalid" ? (
          <p className="auth-error">This verification link is invalid or expired.</p>
        ) : null}
        {googleStatus === "failed" ? (
          <p className="auth-error">Google sign-in could not be completed. Please try again.</p>
        ) : null}

        <form className="auth-fields" onSubmit={handleSubmit}>
          {isSignup ? (
            <label className="form-field form-field-full">
              <span className="auth-field-label">Full name</span>
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
          ) : null}

          <label className="form-field form-field-full">
            <span className="auth-field-label">Email address</span>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="form-field form-field-full">
            <span className="auth-field-label">Password</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {isSignup ? (
            <label className="auth-check-row">
              <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
              <span>
                I agree to the <Link href="/terms">Terms of Use</Link> and{" "}
                <Link href="/privacy">Privacy Policy</Link>.
              </span>
            </label>
          ) : null}

          {!isSignup ? (
            <div className="auth-helper-row">
              <label className="auth-remember">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <span className="auth-forgot">Forgot password?</span>
            </div>
          ) : null}

          {error ? <p className="auth-error">{error}</p> : null}
          {notice ? <p className="auth-notice">{notice}</p> : null}
          {verifyUrl ? (
            <div className="auth-dev-preview">
              <strong>Verification link preview</strong>
              <p className="muted">
                Local development preview only. Use this link to confirm the account while email delivery is being tested.
              </p>
              <Link href={verifyUrl}>Confirm email now</Link>
            </div>
          ) : null}

          <button type="submit" className="button-primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait" : isSignup ? "Create account" : "Sign in"}
          </button>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <a
            href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(
              safeNextPath ? `/api/google-auth?next=${encodeURIComponent(safeNextPath)}` : "/api/google-auth",
            )}`}
            className="button-secondary auth-submit auth-google-button"
          >
            <span className="auth-google-mark" aria-hidden="true">
              <span className="auth-google-mark-blue">G</span>
            </span>
            <span>Continue with Google</span>
          </a>
        </form>

        <div className="auth-inline-link">
          {isSignup ? (
            <>
              <span className="muted">Already have an account?</span> <Link href={`/login${authSwitchQuery}`}>Sign in</Link>
            </>
          ) : (
            <>
              <span className="muted">No account yet?</span> <Link href={`/signup${authSwitchQuery}`}>Create one</Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
