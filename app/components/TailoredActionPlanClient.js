"use client";

import Link from "next/link";
import { useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

const PAYMENT_OPTIONS = [
  {
    id: "card",
    label: "Credit / Debit Card",
    kind: "card",
  },
  {
    id: "apple_pay",
    label: "Apple Pay",
    kind: "apple",
  },
  {
    id: "google_pay",
    label: "Google Pay",
    kind: "google",
  },
];

function PaymentLogo({ kind }) {
  if (kind === "card") {
    return (
      <span className="payment-logo-stack" aria-hidden="true">
        <span className="payment-logo-visa">VISA</span>
        <span className="payment-logo-mastercard">
          <span className="payment-logo-mastercard-circle payment-logo-mastercard-left" />
          <span className="payment-logo-mastercard-circle payment-logo-mastercard-right" />
        </span>
      </span>
    );
  }

  if (kind === "apple") {
    return (
      <span className="payment-logo-wordmark payment-logo-apple" aria-hidden="true">
        <span className="payment-logo-apple-icon"></span>
        <span>Pay</span>
      </span>
    );
  }

  return (
    <span className="payment-logo-wordmark payment-logo-google" aria-hidden="true">
      <span className="payment-logo-google-g">G</span>
      <span>Pay</span>
    </span>
  );
}

export function TailoredActionPlanClient() {
  const { status, user } = useCurrentUser();
  const [method, setMethod] = useState("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleProceed() {
    setError("");

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ method: "card" }),
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to start payment.");
      }

      window.location.href = data.url;
    } catch (submitError) {
      setError(submitError.message || "Unable to start payment.");
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored action plan</div>
        <h1 className="page-title">Loading your account.</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored action plan</div>
        <h1 className="page-title">Sign in to continue.</h1>
        <p className="page-lead">Your personalized action plan is tied to your account and assessment record.</p>
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

  return (
    <section className="result-shell">
      <div className="eyebrow">Tailored action plan</div>
      <h1 className="page-title">Choose your payment method.</h1>
      <p className="page-lead">Select the payment option that suits you best, then continue directly.</p>

      <div className="payment-list-shell" style={{ marginTop: 28 }}>
        <h2 className="payment-list-title">Select payment method</h2>
        <div className="payment-method-list">
          {PAYMENT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`payment-list-row${method === option.id ? " selected" : ""}`}
              onClick={() => setMethod(option.id)}
            >
              <span className="payment-list-left">
                <span className={`payment-radio${method === option.id ? " selected" : ""}`} aria-hidden="true" />
                <span className="payment-list-copy">
                  <strong>{option.label}</strong>
                </span>
              </span>
              <PaymentLogo kind={option.kind} />
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="stack-actions">
        <button type="button" className="button-primary" onClick={handleProceed} disabled={isSubmitting}>
          {isSubmitting ? "Redirecting..." : "Proceed to payment"}
        </button>
        <Link href="/results" className="button-secondary">
          Back to result
        </Link>
      </div>
    </section>
  );
}
