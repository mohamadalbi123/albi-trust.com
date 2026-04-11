"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCurrentUser } from "./useCurrentUser";

export function CheckoutClient() {
  const { status, user } = useCurrentUser();
  const searchParams = useSearchParams();
  const method = searchParams.get("method") === "crypto" ? "crypto" : "card";
  const draftOrderId = String(searchParams.get("order") || "").trim();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleProceed() {
    setError("");

    if (method === "crypto") {
      setError("Crypto payments are not connected yet. Please use card for now.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ method, draftOrderId }),
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
        <div className="eyebrow">Checkout</div>
        <h1 className="page-title">Loading checkout.</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Checkout</div>
        <h1 className="page-title">Sign in to continue.</h1>
        <div className="stack-actions">
          <Link href="/login?next=%2Ftailored-intake" className="button-primary">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="result-shell">
      <div className="eyebrow">Checkout</div>
      <h1 className="page-title">{draftOrderId ? "Complete your payment." : "Add your details before payment."}</h1>
      <p className="page-lead">
        {draftOrderId
          ? `You selected ${method === "crypto" ? "crypto" : "card"} as your payment method.`
          : "Your action plan needs an intake form before checkout can start."}
      </p>

      {!draftOrderId ? (
        <div className="stack-actions">
          <Link href="/tailored-intake" className="button-primary">
            Continue to intake
          </Link>
          <Link href="/results" className="button-secondary">
            Back to result
          </Link>
        </div>
      ) : null}

      {draftOrderId ? (
        <div className="action-grid" style={{ marginTop: 28 }}>
          <div className="action-card">
            <strong>Account</strong>
            <p className="muted">{user.fullName}</p>
            <p className="muted">{user.email}</p>
          </div>
          <div className="action-card">
            <strong>User ID</strong>
            <p className="muted">{user.id}</p>
          </div>
          <div className="action-card">
            <strong>Payment method</strong>
            <p className="muted">{method === "crypto" ? "Crypto" : "Card"}</p>
          </div>
        </div>
      ) : null}

      {draftOrderId && method === "card" ? (
        <p className="page-lead" style={{ marginTop: 18 }}>
          Card checkout is handled by Stripe. Apple Pay and Google Pay can appear there automatically on supported devices and browsers.
        </p>
      ) : draftOrderId ? (
        <p className="page-lead" style={{ marginTop: 18 }}>
          Crypto checkout is not connected yet. Please return and choose card for now.
        </p>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {draftOrderId ? (
        <div className="stack-actions">
          <button type="button" className="button-primary" onClick={handleProceed} disabled={isSubmitting}>
            {isSubmitting ? "Redirecting to Stripe..." : "Proceed to payment gateway"}
          </button>
          <Link href="/tailored-action-plan" className="button-secondary">
            Back
          </Link>
        </div>
      ) : null}
    </section>
  );
}
