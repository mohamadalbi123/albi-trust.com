"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentUser } from "./useCurrentUser";

export function TailoredIntakeClient() {
  const { status, user } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [form, setForm] = useState({
    tradingYears: "",
    profitableBefore: "",
    previousExperience: "",
    currentWorkStatus: "",
    employmentType: "",
    hasChildren: "",
    childrenCount: "",
    country: "",
    originCountry: "",
    tradingSession: "",
    dailyTradingHours: "",
    usualTradingTime: "",
    energyLevel: "",
    dependsOnTradingIncome: "",
    personalBackground: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");
  const isPaidStep = searchParams.get("paid") === "1";
  const orderId = searchParams.get("order");

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessNotice("");
    setIsSubmitting(true);

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to create order.");
      setIsSubmitting(false);
      return;
    }

    const checkoutResponse = await fetch("/api/stripe/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "card",
        draftOrderId: data.order.id,
      }),
    });
    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok || !checkoutData?.url) {
      setError(checkoutData.error || "Unable to start payment.");
      setIsSubmitting(false);
      return;
    }

    window.location.href = checkoutData.url;
  }

  if (status === "loading") {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored intake</div>
        <h1 className="page-title">Loading your account.</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Tailored intake</div>
        <h1 className="page-title">Sign in to continue.</h1>
      </section>
    );
  }

  if (!isPaidStep) {
    return (
      <section className="result-shell">
        <div className="eyebrow">Additional information</div>
        <h1 className="page-title">Add your details before payment.</h1>
        <p className="page-lead">
          These optional details help us tailor the action plan around your trading level, personal situation, and life context before you continue to payment.
        </p>

        <div className="mini-grid" style={{ marginTop: 24 }}>
          <div className="metric">
            <span>User</span>
            <strong>{user.fullName}</strong>
          </div>
          <div className="metric">
            <span>User ID</span>
            <strong>{user.id}</strong>
          </div>
        </div>

        <form className="auth-fields tailored-intake-form" style={{ marginTop: 24 }} onSubmit={handleSubmit}>
          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.tradingYears}
                onChange={(event) => updateField("tradingYears", event.target.value)}
              >
                <option value="">Years trading</option>
                <option value="Less than 1 year">Less than 1 year</option>
                <option value="1-2 years">1-2 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="6-10 years">6-10 years</option>
                <option value="10+ years">10+ years</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.profitableBefore}
                onChange={(event) => updateField("profitableBefore", event.target.value)}
              >
                <option value="">Have you ever been profitable?</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <input
                type="text"
                placeholder="Previous experience before trading"
                value={form.previousExperience}
                onChange={(event) => updateField("previousExperience", event.target.value)}
              />
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.currentWorkStatus}
                onChange={(event) => updateField("currentWorkStatus", event.target.value)}
              >
                <option value="">Current work status</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Student">Student</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.employmentType}
                onChange={(event) => updateField("employmentType", event.target.value)}
              >
                <option value="">Employment type</option>
                <option value="Fixed hours">Fixed hours</option>
                <option value="Flexible">Flexible</option>
                <option value="Self-employed">Self-employed</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.hasChildren}
                onChange={(event) => updateField("hasChildren", event.target.value)}
              >
                <option value="">Children</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <input
                type="text"
                placeholder="Children count (optional)"
                value={form.childrenCount}
                onChange={(event) => updateField("childrenCount", event.target.value)}
              />
            </label>
            <label className="form-field">
              <input
                type="text"
                placeholder="Country where you live"
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
              />
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <input
                type="text"
                placeholder="Country you come from"
                value={form.originCountry}
                onChange={(event) => updateField("originCountry", event.target.value)}
              />
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.dependsOnTradingIncome}
                onChange={(event) => updateField("dependsOnTradingIncome", event.target.value)}
              >
                <option value="">Rely on trading income?</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.tradingSession}
                onChange={(event) => updateField("tradingSession", event.target.value)}
              >
                <option value="">Usual trading session</option>
                <option value="Asia">Asia</option>
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="No fixed session">No fixed session</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.dailyTradingHours}
                onChange={(event) => updateField("dailyTradingHours", event.target.value)}
              >
                <option value="">Trading hours per day</option>
                <option value="<1h">&lt;1h</option>
                <option value="1-2h">1-2h</option>
                <option value="2-4h">2-4h</option>
                <option value="4h+">4h+</option>
              </select>
            </label>
          </div>

          <div className="auth-name-row tailored-intake-row">
            <label className="form-field">
              <select
                className="form-select"
                value={form.usualTradingTime}
                onChange={(event) => updateField("usualTradingTime", event.target.value)}
              >
                <option value="">When do you usually trade?</option>
                <option value="Before work">Before work</option>
                <option value="During work">During work</option>
                <option value="After work">After work</option>
                <option value="Random">Random</option>
              </select>
            </label>
            <label className="form-field">
              <select
                className="form-select"
                value={form.energyLevel}
                onChange={(event) => updateField("energyLevel", event.target.value)}
              >
                <option value="">Energy level after daily responsibilities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>
          </div>

          <label className="form-field form-field-full">
            <textarea
              className="tailored-textarea"
              placeholder="Tell me about your daily life and trading situation. Example: I work full time, trade in the evening, have 2 kids, feel tired after work, and struggle with discipline after losses."
              value={form.personalBackground}
              maxLength={6000}
              onChange={(event) => updateField("personalBackground", event.target.value)}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <div className="stack-actions">
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Preparing payment..." : "Continue to payment - $99"}
            </button>
            <Link href="/results" className="button-secondary">
              Back to result
            </Link>
          </div>
        </form>
      </section>
    );
  }

  async function handleFinalize() {
    if (!orderId) {
      setError("Missing order reference after payment.");
      return;
    }

    setError("");
    setSuccessNotice("");
    setIsFinalizing(true);

    const response = await fetch("/api/orders/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to finalize your order.");
      setIsFinalizing(false);
      return;
    }

    setSuccessNotice("Thank you for your purchase. You will receive your tailored action plan within 48 hours by email.");
    setIsFinalizing(false);

    window.setTimeout(() => {
      router.push(`/dashboard?order=${data.order.id}`);
      router.refresh();
    }, 2600);
  }

  useEffect(() => {
    if (!isPaidStep || !orderId || isFinalizing || successNotice) return;
    handleFinalize();
  }, [isPaidStep, orderId, isFinalizing, successNotice]);

  return (
    <section className="result-shell">
      {successNotice ? (
        <div className="assessment-start-overlay">
          <div className="assessment-start-modal">
            <div className="eyebrow">Payment confirmed</div>
            <h1 className="page-title assessment-start-title">Thank you for your purchase.</h1>
            <p className="page-lead">{successNotice}</p>
          </div>
        </div>
      ) : null}

      <div className="eyebrow">Payment confirmed</div>
      <h1 className="page-title">Finalizing your tailored action-plan order.</h1>
      <p className="page-lead">
        Your payment was successful. We are now creating the final admin order with your intake details and assessment result.
      </p>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="stack-actions" style={{ marginTop: 24 }}>
        <button type="button" className="button-primary" onClick={handleFinalize} disabled={isFinalizing || Boolean(successNotice)}>
          {isFinalizing ? "Finalizing order..." : "Finalize now"}
        </button>
      </div>
    </section>
  );
}
